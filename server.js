var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var boxoffice = require('./boxoffice');

const app = express();

app.use(cors());
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

var port = process.env.PORT || 8000;

app.post('/api/create', boxoffice.generateTicket);
app.put('/api/reprice', boxoffice.repriceTicket);
app.put('/api/transfer', boxoffice.transferTicket);
app.get('/api/ticketbyowner/:id', boxoffice.ticketFromOwner);
app.get('/api/ticketHistory/:id', boxoffice.ticketHistory);
app.get('/api/alltickets', boxoffice.queryAllTickets);
app.post('/api/delete', boxoffice.deleteTicket);
app.put('/api/lock', boxoffice.lockTicket);

app.get('/api/version', function(req, res){
    res.json({version: '1.0.0' });
});

app.listen(port);
console.log('   _____                .__  .__           ___________.__        __           __  .__                   _________               __                  \r\n  \/  _  \\ ______   ____ |  | |  |   ____   \\__    ___\/|__| ____ |  | __ _____\/  |_|__| ____    ____    \/   _____\/__.__. _______\/  |_  ____   _____  \r\n \/  \/_\\  \\\\____ \\ \/  _ \\|  | |  |  \/  _ \\    |    |   |  |\/ ___\\|  |\/ \/\/ __ \\   __\\  |\/    \\  \/ ___\\   \\_____  <   |  |\/  ___\/\\   __\\\/ __ \\ \/     \\ \r\n\/    |    \\  |_> >  <_> )  |_|  |_(  <_> )   |    |   |  \\  \\___|    <\\  ___\/|  | |  |   |  \\\/ \/_\/  >  \/        \\___  |\\___ \\  |  | \\  ___\/|  Y Y  \\\r\n\\____|__  \/   __\/ \\____\/|____\/____\/\\____\/    |____|   |__|\\___  >__|_ \\\\___  >__| |__|___|  \/\\___  \/  \/_______  \/ ____\/____  > |__|  \\___  >__|_|  \/\r\n        \\\/|__|                                                \\\/     \\\/    \\\/             \\\/\/_____\/           \\\/\\\/         \\\/            \\\/      \\\/ ');

console.log('Access the Box Office at http://localhost:'+ port);
