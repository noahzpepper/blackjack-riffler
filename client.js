var socket = io();

var deadline = null;
var timer = null;

socket.on('init', (data) => {
	deadline = data.deadline;
	startTimer();
});

socket.on('card', (data) => {
	document.getElementById('card').src = cardObjToSvgName(data.card);
})

socket.on('pass', (data) => {
	document.getElementById('timer').innerHTML = 'You got the count correct!';
	document.getElementById('magicnumber').innerHTML = '<br>Here is your magic number:<br>' + data.code;
	resetClient();
});

socket.on('fail_answered', (data) => {
	document.getElementById('timer').innerHTML = (
		'You already submitted an answer for this deck.<br>' +
		'Click the cards to begin a new deck.'
	);
	resetClient();
});

socket.on('fail_wrong', (data) => {
	document.getElementById('timer').innerHTML = 'Sorry, the correct count was ' + data.correct + '.';
	resetClient();
});

socket.on('fail_see_all_cards', (data) => {
	document.getElementById('timer').innerHTML = (
		'You got the count right without looking at all the cards?<br>' +
		'Nice guessing, but try again.'
	);
	resetClient();
})

socket.on('fail_time', (data) => {
	document.getElementById('timer').innerHTML = (
		'You got the count right, but you need to be faster.<br>' +
		'Be sure to submit your answer before the timer runs out.'
	);
	resetClient();
})

function resetClient() {
	deadline = null;
	clearInterval(timer);
	document.getElementById('card').src = 'cards/BLUE_BACK.svg';
	document.getElementById('count').value = '';
};

window.onload = function() {
	document.getElementById('card').addEventListener('click', nextCard);
	document.getElementById('submit').addEventListener('click', sendAnswer);
	document.getElementById('count').value = '';
	socket.emit('reset');
};

function cardObjToSvgName(cardObj) {
	if (!cardObj) {
		return 'cards/BLUE_BACK.svg';
	}
	return 'cards/' + cardObj.rank + cardObj.suit + '.svg';
}

function nextCard() {
	socket.emit('request_card');
	console.log('req');
}

function sendAnswer() {
	socket.emit('answer', {count: document.getElementById('count').value});
	document.getElementById('timer').style.color = "#000000";
}

function startTimer() {
	if (deadline === null) {
		return;
	}
	timer = setInterval(() => {
		var time_remaining = Math.floor((deadline - Date.now()) / 1000);
		if (time_remaining < 0) {
			document.getElementById('timer').innerHTML = "Time's up.";
			document.getElementById('timer').style.color = "#FF0000";
		} else {
			document.getElementById('timer').innerHTML = "Time remaining: " + time_remaining;
			document.getElementById('timer').style.color = "#000000";
		}
	}, 250);
}

document.onkeydown = function(e) {
	e = e || window.event;
	switch (e.keyCode) {
		case 32: //SPACEBAR
			nextCard();
			break;
		case 13: //ENTER
			sendAnswer();
			break;
		default:
			break;
	}
}