// Data =================================================================
var haveData = false;
var courses = [];

// Load and run a script.
function load(url) {
    var script = document.createElement('script');
    script.setAttribute('src', url);
    script.setAttribute('id', 'jsonScript');
    script.setAttribute('type', 'text/javascript');
    document.documentElement.firstChild.appendChild(script);
}

// Ask for data from the spreadsheet.
function startDataLoad() {
    var spreadsheetKey = "0Asw-rVCOgjt8dFBndXdYTWVhaDJpaW5LbXl2QTliUWc";
    var wsId = "od6";
    load('http://spreadsheets.google.com/feeds/list'
         + '/' + spreadsheetKey + '/' + wsId + '/public/values' +
         '?alt=json-in-script&callback=onSpreadsheetData');
}

// This is called when the data loads from the spreadsheet.
function onSpreadsheetData(json) {
    var fields = ["locationName", "address", "organization", "courseName",
                  "startDate", "fee", "days", "times", "description",
                  "contactInfo", "url"];
    var lastRow = {};
    json.feed.entry.forEach(function (row) {
        var newRow = {};
        fields.forEach(function (name) {
            var fieldName = name.toLowerCase();
            var value = row["gsx$" + fieldName].$t;
            newRow[name] = value || lastRow[name];
        });
        lastRow = newRow;

        // Only add the row to courses if it has been approved.
        if (row.gsx$status.$t == 'Approved')
            courses.push(newRow);
    });
    haveData = true;
    updateMap();
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

function showPopup(address) {
    var matches = courses.filter(function (course) { return course.address == address; });
    var c = matches[0]
    model.update({
        organization: c.organization,
        address: address,
        coursesAtLocation: matches
    });
    document.getElementById("location-popup").style.display = "block";
}

function hidePopup() {
    document.getElementById("location-popup").style.display = "none";
}


// Map ========================================================================
google.maps.visualRefresh = true;
var map = undefined, geocoder;

function insertPin(course) {
    var address = course.address;
    var organization = course.organization;

    geocoder.geocode(
        {'address': address},
        function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                var marker = new google.maps.Marker({
                    map: map,
                    position: results[0].geometry.location,
                    title: organization
                });
                google.maps.event.addListener(marker, 'click', function() {
                    showPopup(address);
                });
            } else {
                console.error("Geocoding failed: " + status);
            }
        });
}

function initialize() {
    // Create the map.
    map = new google.maps.Map(document.getElementById("map-canvas"), {
        center: new google.maps.LatLng(36.16, 273.215),
        zoom: 12,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    geocoder = new google.maps.Geocoder();

    startDataLoad();
    ko.applyBindings(model);
}

function updateMap() {
    for (var i = 0; i < courses.length; i++)
        insertPin(courses[i]);
}

google.maps.event.addDomListener(window, 'load', initialize);

