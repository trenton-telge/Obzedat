let socket = io();
let gameID;
let myTotal;
let twitchMode = false;
socket.on('message', function(data) {
    console.log(data);
});
socket.on('lifetotal-change', function (totalString) {
    let total = JSON.parse(totalString);
    if (total.tag === "life") {
        document.getElementById(total.user).innerHTML = `<p>${total.value}</p>`
    }
});
socket.on('request-init', function() {
    console.log("Init requested.")
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('init-screen').style.display = 'flex';
});


socket.on('joined-existing-lobby', function (totalsString) {
    let totals = JSON.parse(totalsString);
    let lifeTotals = [];
    totals.forEach(total => {
        if (total.tag === "life") {
            lifeTotals.push(total);
        }
    });
    if (twitchMode){
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('init-screen').style.display = 'none';
        displayLifeTotalsForTwitch(lifeTotals);
        document.getElementById('twitch-screen').style.display = 'flex';
    } else {
        document.getElementById('start-screen').style.display = 'none';
        document.getElementById('init-screen').style.display = 'none';
        document.getElementById('code-display').innerText = gameID;
        displayLifeTotals(lifeTotals);
        document.getElementById('counter-screen').style.display = 'flex';
    }
});

function uuidv4() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}
function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() *
            charactersLength));
    }
    return result;
}
const USER_ID = uuidv4();
console.log(`Your unique session ID is ${USER_ID}.`);

function createGame() {
    gameID = makeid(6);
    joinGame(gameID);
}

function submitPreferences(){
    socket.emit('set-prefs', JSON.stringify({game: gameID, tag: "starting-total", value: document.getElementById('starting-total').value}))
}

function joinGame(code) {
    gameID = code.toUpperCase();
    socket.emit('join-lobby', JSON.stringify({user: USER_ID, game: gameID}));
}

function displayLifeTotals(totals) {
    myTotal = totals.filter(total => total.user === USER_ID)[0].value;
    document.getElementById("counter-n1").style.display = "flex";
    document.getElementById("counter-n1").innerHTML =
        `<div class="counter-ob">
            <div id="${USER_ID}-total" class="counter-num"><p>${myTotal}</p></div>
            <div class="counter-top" onclick="addLife()"></div>
            <div class="counter-bottom" onclick="subtractLife()"></div>
        </div>`
}

function addLife() {
    myTotal++;
    document.getElementById(`${USER_ID}-total`).innerHTML = `<p>${myTotal}</p>`;
    socket.emit('set-total', JSON.stringify({user: USER_ID, tag: "life", value: myTotal}));
}

function subtractLife() {
    myTotal--;
    document.getElementById(`${USER_ID}-total`).innerHTML = `<p>${myTotal}</p>`;
    socket.emit('set-total', JSON.stringify({user: USER_ID, tag: "life", value: myTotal}));
}

function joinAsTwitch(code) {
    gameID = code.toUpperCase();
    twitchMode = true;
    socket.emit('join-lobby-twitch', JSON.stringify({user: USER_ID, game: gameID}));
}

function displayLifeTotalsForTwitch(lifeTotals) {
    let num = 1;
    lifeTotals.forEach(total => {
        document.getElementById("twitch-screen").innerHTML +=
            `<div class="twitch-totals-container">
                <div id="${total.user}" class="twitch-life-container"><p>${total.value}</p></div>
                <p contenteditable="true" class="twitch-player-name">Player ${num}</p>
            </div>`
        num++;
    });
}