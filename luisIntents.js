require('dotenv-extended').load();

var restify = require('restify');
var builder = require('botbuilder');
var moment = require('moment');

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
var bot = new builder.UniversalBot(connector);

server.post('/api/messages', connector.listen());

// Para utilizar variables de entorno
//dotenv.config(); 

let luisApp = process.env.LUIS_APP;
let luisKey = process.env.LUIS_KEY;

// Crear un procesador LUIS que apunte a nuestro modelo en el root (/)
var model = process.env.LUIS_MODEL_URL;

var recognizer = new builder.LuisRecognizer(model);
var dialog = new builder.IntentDialog({ recognizers: [recognizer] });

bot.dialog('/', dialog);

dialog.matches('SaludarEmpezar', function (session, results) {
    session.send('Hola ¿En que te puedo ayudar?');
});

// Esta función se ejecuta cuando el Intent == ordenarTaxi
dialog.matches('OrdenarPedido', [
    function (session, args, next) {
        //builder.Prompts.text(session, '¿A dónde envío tu pedido?');
        const pizzas = ['Carbonara', 'Barbacoa', 'Margarita', 'Pepperoni', 'Especialidad'];
        const entityPizza = builder.EntityRecognizer.findEntity(args.entities, 'producto');
        var match = null;
        session.conversationData.product = null;

        if (entityPizza) {
            match = builder.EntityRecognizer.findBestMatch(pizzas, entityPizza.entity);
            session.conversationData.product = match;
        }
    
        if (!match) {
            builder.Prompts.choice(session, 'Ahora mismo tenemos estas pizzas disponibles, ¿Cual te gustaría probar?', pizzas, { listStyle :  builder.ListStyle.button });
            match = builder.EntityRecognizer.findBestMatch(pizzas, entityPizza.entity);
            session.conversationData.product = match;
        } else {
            next({  response: match });
        }
    },
    function(session, args){
        session.beginDialog('/preguntarLugar');
    },
    function (session, results) {
        if (results.response) {
            const time = moment().add(30, 'm');
    
            session.dialogData.time = time.format('HH:mm');
            session.send("De acuerdo, tu pizza %s llegará a las %s.", session.conversationData.product, session.dialogData.time);
        } else {
            session.send('De acuerdo, si no te gustan, intenta la próxima vez :)');
        }
    },
    function(session, args) {
        session.send(`Enviando el pedido a tu dirección **${args.response}**`);
    }
]);

dialog.matches('AyudaConsulta', [
    function (session, args, next) {
        //builder.Prompts.text(session, '¿A dónde envío tu pedido?');
        session.beginDialog('ayuda');
    },
    function(session, args) {
        builder.Prompts.choice(session, "Elije 1 Opción:", 'Flip A Coin|Roll Dice|Magic 8-Ball|Quit');
    }
]);

dialog.matches('ObtenerDireccion', [
    function (session, args, next){
        session.endDialogWithResult(results);
    }
]);

dialog.matches('CancelarPedido', [
    function (session, args, next) {
        session.send('Ok, cancelaré tu Pedido.');
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

bot.dialog('ayuda', [
    function (session) {
        builder.Prompts.choice(session, "Elije 1 Opción:", 'Ordenar|Cancelar');
    },
    function (session, results) {
        switch (results.response.index) {
            case 0:
                session.endDialog();
                break;
            case 1:
                session.beginDialog('CancelarPedido');
                break;
            default:
                session.endDialog();
                break;
        }
    }
]).triggerAction({ matches: /^ayuda/i });

bot.dialog('salir', [
    function(session){
        session.send('Ok, cancelaré tu Pedido.');
    }
]).triggerAction({ matches: /^cancelar/i });

//Este es el Default, cuando LUIS no entendió la consulta.
dialog.onDefault(builder.DialogAction.send("No entendí. Me lo decís de nuevo pero de otra manera, por favor?"));