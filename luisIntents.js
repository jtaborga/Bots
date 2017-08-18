require('dotenv-extended').load();

var restify = require('restify');
var builder = require('botbuilder');

// Levantar restify
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// No te preocupes por estas credenciales por ahora, luego las usaremos para conectar los canales.
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID, 
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Ahora utilizamos un UniversalBot
var bot = new builder.UniversalBot(connector, function(session){
    session.send('Bienvenido a la banca virtual. Envía \'Ayuda\' si tienes dudas.')
});
server.post('/api/messages', connector.listen());

// Para utilizar variables de entorno
dotenv.config(); 

let luisApp = process.env.LUIS_APP;
let luisKey = process.env.LUIS_KEY;

// Crear un procesador LUIS que apunte a nuestro modelo en el root (/)
var model = process.env.LUIS_MODEL_URL;

var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });
bot.dialog('/', dialog);

// Esta función se ejecuta cuando el Intent == ordenarTaxi
dialog.matches('OrdenarPedido', [
    function (session, args, next) {
        //builder.Prompts.text(session, '¿A dónde envío tu pedido?');
        session.beginDialog('/preguntarLugar');
    },
    function(session, args) {
        session.send(`Enviando el pedido a tu dirección **${args.response}**`);
    }
]);

dialog.matches('ObtenerDireccion', [
    function (session, args, next){
        session.endDialogWithResult(results);
    }
]);

dialog.matches('CancelarPedido', [
    function (session, args, next) {
        session.send('Ok, cancelaré tu Pedido.')
    }
]);

bot.dialog('/preguntarLugar', [
    function (session) {
        builder.Prompts.text(session, '¿A dónde envío tu pedido?');
    },
    function (session, results) {
        session.endDialogWithResult(results);
    }
]);

//Este es el Default, cuando LUIS no entendió la consulta.
dialog.onDefault(builder.DialogAction.send("No entendí. Me lo decís de nuevo pero de otra manera, por favor?"));