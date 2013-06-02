// Data =================================================================
var haveData = false;
var courses = [];

// Ask for data from the spreadsheet.
function startDataLoad(callback) {
    var spreadsheetKey = "0Asw-rVCOgjt8dFBndXdYTWVhaDJpaW5LbXl2QTliUWc";
    var wsId = "od6";
    var url = "http://spreadsheets.google.com/feeds/list/" + spreadsheetKey + "/" + wsId + "/public/values?alt=json";

    $.getJSON(url, function (json) {
        onSpreadsheetData(json);
        callback();
    });
}

// This is called when the data loads from the spreadsheet.
function onSpreadsheetData(json) {
    var fields = ["organization", "locationName", "address", "latitudeLongitude",
                  "courseName", "startDate", "fee", "days", "times", "description",
                  "contactInfo", "url"];
    var lastRow = {};
    json.feed.entry.forEach(function (row) {
        var newRow = {};

        // Empty cells are automatically filled based on the preceding row, but
        // ONLY if this row has the same organization as the last one.
        // Obviously it would be silly to auto-fill a row for one course with
        // values from a different organization's course!
        var org = row.gsx$organization.$t;
        var sameOrg = org === lastRow.organization || org === "";

        // Populate all the fields.
        fields.forEach(function (name) {
            var fieldName = name.toLowerCase();
            var value = row["gsx$" + fieldName].$t;
            if (sameOrg && value === "")
                value = lastRow[name];
            newRow[name] = value;
        });
        lastRow = newRow;

        // Only add the row to courses if it has been approved.
        if (row.gsx$status.$t == 'Approved')
            courses.push(newRow);
    });
    haveData = true;
}

// This is the function that figures out which courses to show on the map.
function getFilteredCourses() {
    // For each course, execute the function to determine whether we should
    // show it or not.
    return courses.filter(function (course) {
        
        // Filter by start date.
        var courseDate = course.startDate;
        if (courseDate !== "" && courseDate.indexOf('/') !== -1) {
            var filterInput = parseInt($("#start_date_menu").val());
            var filterEnd = moment().day(filterInput);
            var filterStart = moment();
            if (filterInput === 60) {
                filterStart = moment().add('d', 30);
            }
            if (filterInput === 90) {
                filterStart = moment().add('d', 60);
            }
            var courseCompare = moment(courseDate);
            if (courseCompare.valueOf() <= filterEnd.valueOf()
                    && courseCompare.valueOf() >= filterStart.valueOf()) {
            } else {
                return false;
            }
        }
        
        // Filter by level.
        var level = $("#level_menu").val();
        if (level !== "" && course.courseName.toLowerCase().indexOf(level.toLowerCase()) === -1)
            return false;

        // Filter by cost.
        var fee = $("#cost_menu").val();
        var courseFee = course.fee.toLowerCase();
        if (fee !== courseFee.toLowerCase() && fee !== "") {
            if (courseFee !== "" && courseFee !== "free") {
                var testFee = parseInt(courseFee);
                var filterFee = parseInt(fee);
                if ((filterFee === 100 || filterFee === 200) && testFee >= filterFee) {
                    return false;
                }
                if (filterFee === 201 && testFee < filterFee) {
                    return false;
                }
            } else {
                return false;
            }
        }

        // Filter by day of week.
        var day = $("#day_menu").val();
        if (day !== "") {
            var courseDay = course.days;
            courseDay = courseDay.split(',');
            var showMark = false;
            courseDay.forEach(function (courseDay) {
                if (courseDay.toLowerCase() === day.toLowerCase()) {
                    showMark = true;
                }
            });
            if (showMark === false) {
                return false;
            }
        }

        // Filter by time of day.
        var time = $("#time_menu").val();
        var courseTime = course.times;
        if (time !== "") {
            if (courseTime === "") {
                return false;
            }
            courseTime = moment(course.times, "HH:mm:ss");
            var startRange = moment("00:00:00", "HH:mm:ss");
            var compareTime = moment("07:59:00", "HH:mm:ss");
            if (time === "12:00:00") {
                startRange = moment("08:00:00", "HH:mm:ss");
                compareTime = moment("12:00:00", "HH:mm:ss");
            }
            if (time === "17:00:00") {
                startRange = moment("12:01:00", "HH:mm:ss");
                compareTime = moment("17:00:00", "HH:mm:ss");
            }
            if (time === "24:00:00") {
                startRange = moment("17:01:00", "HH:mm:ss");
                compareTime = moment("23:59:00", "HH:mm:ss");
            }
            if (courseTime.valueOf() >= startRange.valueOf() 
                && courseTime.valueOf() <= compareTime.valueOf()) {
            } else {
                return false;
            }
        }

        // If we passed all those, this course is selected. Hooray!
        return true;
    });
}


// Knockout bindings :( =======================================================

function ViewModel() {
    var self = this;

    self.organization = ko.observable();
    self.address = ko.observable();
    self.coursesAtLocation = ko.observableArray();
    self.anySelected = ko.observable(false);
    self.selectedCourseName = ko.observable();
    self.selectedDays = ko.observable();
    self.selectedTimes = ko.observable();
    self.selectedDescription = ko.observable();
    self.selectedContactInfo = ko.observable();
    self.selectedUrl = ko.observable();
    
    self.select = function (data) {
        self.selectedCourseName(data.courseName);
        self.selectedDays(data.days);
        self.selectedTimes(data.times);
        self.selectedDescription(data.description);
        self.selectedContactInfo(data.contactInfo);
        self.selectedUrl(data.url);
        self.anySelected(true);
    };

    self.update = function (data) {
        self.organization(data.organization);
        self.address(data.address);
        self.coursesAtLocation.removeAll();
        data.coursesAtLocation.forEach(function (course) {
            self.coursesAtLocation.push(course);
        });
        self.anySelected(false);
    };

    self.viewWebsite = function () {
        document.location.href = self.selectedUrl();
    };
}

var model = new ViewModel;
var selectedAddress = null;

function selectAddress(address) {
    selectedAddress = address;
    updatePopup();
}

function updatePopup() {
    var matches = getFilteredCourses().filter(function (course) {
        return course.address == selectedAddress;
    });
    if (matches.length !== 0) {
        model.update({
            organization: matches[0].organization,
            address: selectedAddress,
            coursesAtLocation: matches
        });
        document.getElementById("location-popup").style.display = "block";
    }
}

function hidePopup() {
    document.getElementById("location-popup").style.display = "none";
}


// Map ========================================================================
google.maps.visualRefresh = true;
var map = undefined, geocoder;
var markers = [];

function insertPin(course) {
    var address = course.address;
    var organization = course.organization;

    if (course.latitudeLongitude === "") {
        geocoder.geocode(
            {'address': address},
            function (results, status) {
                if (status == google.maps.GeocoderStatus.OK) {
                    makeMarker(results[0].geometry.location);
                } else {
                    console.error("Geocoding failed: " + status);
                }
            });
    } else {
        var parts = course.latitudeLongitude.split(",");
        makeMarker(new google.maps.LatLng(Number(parts[0]), Number(parts[1])));
    }

    function makeMarker(location) {
        var marker = new google.maps.Marker({
            map: map,
            position: location,
            title: organization
        });
        markers.push(marker);
        google.maps.event.addListener(marker, 'click', function() {
            selectAddress(address);
        });
    }
}

function initialize() {
    // Create the map.
    map = new google.maps.Map(document.getElementById("map-canvas"), {
        center: new google.maps.LatLng(36.16, 273.215),
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    geocoder = new google.maps.Geocoder();

    ko.applyBindings(model);
    $("select.filter_menu").change(updateMap);
    startDataLoad(updateMap);
}

function updateMap() {
    // Remove any old pins from the map.
    markers.forEach(function (marker) {
        marker.setMap(null);
    });
    markers = [];

    // Insert new pins.
    var pinAddresses = [];
    getFilteredCourses().forEach(function (course) {
        if (pinAddresses.indexOf(course.address) === -1) {
            pinAddresses.push(course.address);
            insertPin(course);
        }
    });

    // If the popup is visible, we'll want to update that too.
    updatePopup();
}

google.maps.event.addDomListener(window, 'load', initialize);

