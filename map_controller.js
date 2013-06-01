
// Data =================================================================
var haveData = false;
var courses = [];

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
    var fields = ["locationName", "address", "organization", "level", "startDate", "fee"];
    var lastRow = {};
    json.feed.entry.forEach(function (row) {
        var newRow = {};
        fields.forEach(function (name) {
            var fieldName = name.toLowerCase();
            if (fieldName == "address")
                fieldName = "locationaddress";
            console.log(name);
            var value = row["gsx$" + fieldName].$t;
            newRow[name] = value || lastRow[name];
        });
        lastRow = newRow;
        if (row.gsx$status.$t == 'Approved')
            courses.push(newRow);
    });
    haveData = true;
    updateMap();
}

function showPopup(address) {
    var matches = courses.filter(function (course) { return course.address == address; });
    var c = matches[0]
    ko.applyBindings({
        organization: c.organization,
        address: address,
        coursesAtLocation: matches
    });
    document.getElementById("detail-popup").style.display = "block";
}

function hidePopup() {
    document.getElementById("detail-popup").style.display = "none";
}

// Map ==================================================================
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

// Load and run a script.
function load(url) {
    var script = document.createElement('script');
    script.setAttribute('src', url);
    script.setAttribute('id', 'jsonScript');
    script.setAttribute('type', 'text/javascript');
    document.documentElement.firstChild.appendChild(script);
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
}

function updateMap() {
    // // Create the list of matching courses, grouped by location.
    // var locations = [];
    // for (var i = 0; i < courses.length; i++) {
    //     var course = courses[i];
    // 
    //     // Have we already got a matching course at this location?
    //     var found = false;
    //     for (var j = 0; j < locations.length; i++) {
    //         if (course.locationName == locations[j][0].locationName) {
    //             // Yes, so add this course to the other course we already found.
    //             locations[j].push(course);
    //             found = true;
    //             break;
    //         }
    //     }
    //     if (!found) {
    //         // No, so make a new location group with just this course in it.
    //         locations.push([course]);
    //     }
    // }
    for (var i = 0; i < courses.length; i++)
        insertPin(courses[i]);
}

google.maps.event.addDomListener(window, 'load', initialize);

