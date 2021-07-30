// Dependencies
var express = require('express');
var http = require('http');
var path = require('path');
var socketIO = require('socket.io');

var app = express();
var server = http.Server(app);
var io = socketIO(server);

app.set('port', 5000);
app.use('/', express.static(__dirname + '/static'));

// Routing
app.get('/', function(request, response) {
    response.sendFile(path.join(__dirname, 'index.html'));
});

let GAMEINFO = [];
let CONNECTIONS = [];
let TOTALS = []

// Starts the server.
server.listen(5000, function() {
    console.log('Starting server on port 5000');
});

// Add the WebSocket handlers
io.on('connection', socket => {
    socket.on('join-lobby', data => {
        //Join game
        const joinPair = JSON.parse(data);
        joinPair.socket = socket;
        CONNECTIONS.push(joinPair);
        console.log(`${joinPair.user} requested to join game ${joinPair.game}.`);
        //Set starting life total to 0
        TOTALS.push({user: joinPair.user, tag: "life", value: 0})
        //Check if initialization is needed
        if (CONNECTIONS.filter(conn => conn.game === joinPair.game).length > 1) {
            console.log("Existing game found.")
            //If game exists, set life total to the starting life total preference if it exists
            let foundStartingLife = GAMEINFO.filter( pref => pref.tag === "starting-total" && pref.game === joinPair.game);
            if (foundStartingLife.length > 0) {
                for (var t = 0; t < TOTALS.length; t++) {
                    if (TOTALS[t].user === joinPair.user && TOTALS[t].tag === "life"){
                        TOTALS[t].value = foundStartingLife[0].value;
                    }
                }
            }
            //Send life totals to the client
            getAllTotals(joinPair.game, socket);
        } else {
            //If game not found, pass over to the initialization workflow
            console.log("No existing game found, starting init process...");
            socket.emit('request-init');
        }
        //Make user ID leave all other lobbies
        for (var c = 0; c < CONNECTIONS.length; c++){
            if (CONNECTIONS[c].user === joinPair.user && CONNECTIONS[c].game !== joinPair.game){
                CONNECTIONS[c].pop();
            }
        }
    });
    socket.on('join-lobby-twitch', data => {
        //Join game
        const joinPair = JSON.parse(data);
        joinPair.socket = socket;
        CONNECTIONS.push(joinPair);
        console.log(`${joinPair.user} requested to join game ${joinPair.game} as a spectator.`);
        //Send life totals to the client
        getAllTotals(joinPair.game, socket);
    });
    socket.on('set-prefs', prefsString => {
        let prefs = JSON.parse(prefsString);
        GAMEINFO.push(prefs);
        console.log(`Preference ${prefs.tag} set to ${prefs.value} for game ${prefs.game}.`);
        if (prefs.tag === "starting-total") {
            let users = [];
            for (var connectionsIndex = 0; connectionsIndex < CONNECTIONS.length; connectionsIndex++) {
                if (CONNECTIONS[connectionsIndex].game === prefs.game) {
                    users.push(CONNECTIONS[connectionsIndex].user)
                }
            }
            for (var totalsIndex = 0; totalsIndex < TOTALS.length; totalsIndex++) {
                if (users.includes(TOTALS[totalsIndex].user) && TOTALS[totalsIndex].tag === "life"){
                    TOTALS[totalsIndex].value = prefs.value
                }
            }
        }
        getAllTotals(prefs.game, socket);
    });
    socket.on('set-total', totalString => {
        let total = JSON.parse(totalString);
        let matchingTotal = TOTALS.filter(tempTotal => tempTotal.user === total.user && tempTotal.tag === total.tag);
        if (matchingTotal.length > 0) {
            matchingTotal[0].value = total.value;
        } else {
            TOTALS.push(total);
        }
        console.log(`Total ${total.tag} for user ${total.user} set to ${total.value}.`);
        //Push update to all users in game
        let game = CONNECTIONS.filter(con => con.user === total.user)[0].game
        for (var c = 0; c < CONNECTIONS.length; c++){
            if (CONNECTIONS[c].game === game){
                console.log(`Pushing total change to ${CONNECTIONS[c].user}.`)
                CONNECTIONS[c].socket.emit("lifetotal-change", JSON.stringify(total));
            }
        }
    });
    socket.emit('message', 'Server connected.');
});

function getAllTotals(game, socket){
    let users = [];
    for (var connectionsIndex = 0; connectionsIndex < CONNECTIONS.length; connectionsIndex++) {
        if (CONNECTIONS[connectionsIndex].game === game) {
            users.push(CONNECTIONS[connectionsIndex].user)
        }
    }
    let totals = [];
    for (var totalsIndex = 0; totalsIndex < TOTALS.length; totalsIndex++) {
        if (users.includes(TOTALS[totalsIndex].user)){
            totals.push(TOTALS[totalsIndex]);
        }
    }
    console.log("Sending totals to client for game " + game);
    console.log(JSON.stringify(totals));
    socket.emit('joined-existing-lobby', JSON.stringify(totals))
}