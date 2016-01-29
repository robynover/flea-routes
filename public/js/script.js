console.log($('.addresses li'));
var stops = [];
$('.addresses li').each(function(index){
	stops.push($(this).html());
});
//console.log(stops);

$('#save').click(function(){
	$.ajax({
		method: "POST",
		url: "/save",
		data: {stops: stops}
	})
	  .done(function(response){
	  	console.log(response);
	  	$('.results').html('<p>The route was saved. ' + 
	  						'Go to <a href="/route/' +
	  						response.id + 
	  						'">/route/' +
	  						response.id +
	  						'</a> to see it.'
	  						);
	  });
});
