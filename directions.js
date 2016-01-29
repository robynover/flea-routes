var credentials = require('./credentials');
var Promise = require('bluebird');
var https = require('https');

function buildURL (orig,dest,waypoints) {
	var base = "https://maps.googleapis.com/maps/api/directions/json";
	var apiKey = credentials.gmapsApi;
	var origin = encodeURIComponent(orig);
	var destination = encodeURIComponent(dest);
	wayptStr = '';
	for (var i in waypoints){
		wayptStr += "|" + encodeURIComponent(waypoints[i]);
	}
	var apiUrl = 
		base + 
		"?units=imperial&origin=" + origin + 
		"&destination=" + destination + 
		"&waypoints=optimize:true" + wayptStr + 
		"&key=" + apiKey;
	return apiUrl;
}

function getRouteData(origin,dest,waypoints,personInfo){
	var apiUrl = buildURL(origin,dest,waypoints);

	return new Promise(function(resolve, reject) {
		var request = https.request(apiUrl, function (res) {
			
		    var data = '';
		    res.on('data', function (chunk) {
		        data += chunk;
		    });
		    res.on('end', function () {
		    	// parse the returned data
		    	var obj = JSON.parse(data);
		    	// add in details about people from user data
		    	obj.personInfo = personInfo;
		    	resolve(parseApiData(obj)); 	
		    });
		});
		request.on('error', function (e) {
		    console.log(e.message);
		    reject(e.message);
		});
		request.end();	  
	});

}

function parseApiData (data) {
	//return data;
	//console.log(data);
	var obj = {};
	var distance = 0; //meters
	var duration = 0; // seconds
	var legs = data.routes[0].legs;
	var steps = [];
	obj.waypoints = [];
	obj.markers = [JSON.stringify(legs[0].start_location)];
	obj.polylines = [];
	obj.start = legs[0].start_address;
	obj.end = legs[legs.length - 1].end_address;
	obj.center = JSON.stringify(legs[0].start_location);
	var stopOrder = data.routes[0].waypoint_order;
	obj.bounds_ne = JSON.stringify(data.routes[0].bounds.northeast);
	obj.bounds_sw = JSON.stringify(data.routes[0].bounds.southwest);

	for (var i in legs){
		steps.push(legs[i].steps);
		obj.markers.push(JSON.stringify(legs[i].end_location));
		distance += legs[i].distance.value;
		duration += legs[i].duration.value;
		var num = stopOrder[i];
		var pObj = {};
		// to get just the stops (not start/end pts), get end address for all but last leg
		if (i < legs.length - 1){
			// put location data back with person data in correct order
			pObj.name = data.personInfo[num].name;
			pObj.apt = data.personInfo[num].apt;
			pObj.phone = data.personInfo[num].phone;
			pObj.address = legs[i].end_address;

			obj.waypoints.push(pObj);
		}	
	}
	obj.distance = convertMetersToMiles(distance);
	obj.duration = convertSecToMin(duration);
	obj.est_time = convertMinutesToText(obj.duration + (10 * legs.length));

	for (var i in steps){
		steps[i].forEach(function(step){
			obj.polylines.push(escape(step.polyline.points));
		});
	}

	return obj;
}


// ======= helper functions ======= //
function convertMetersToMiles(meters) {
     return Math.round(meters * 0.000621371192);
}
function convertSecToMin(sec){
	return Math.round(sec/60);
}
function convertMinutesToText (m) {
    var hours = Math.floor(m / 60);
    var minutes = Math.round(m - (hours * 60));

    minutes = (minutes < 10 ? '0' : '') + minutes;

    output = '';
    if (hours){
    	output += hours + " hour";
    }
    if (hours > 1){
    	output += "s";
    }

    return output + ' ' + minutes + ' minutes';
}

// ===== export ===== //
module.exports = getRouteData;