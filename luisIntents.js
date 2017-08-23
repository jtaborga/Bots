require('dotenv-extended').load();

var restify = require('restify');
var builder = require('botbuilder');
var moment = require('moment');
var needle = require('needle');
var url = require('url');
var validUrl = require('valid-url');
var captionService = require('./caption-service');

// Levantar restify
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// No te preocupes por estas credenciales por ahora, luego las usaremos para conectar los canales.
//process.env.MICROSOFT_APP_ID, 
//process.env.MICROSOFT_APP_PASSWORD

var connector = new builder.ChatConnector({
    appId: '',
    appPassword:'' 
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

bot.on('conversationUpdate', function(message){
    if(message.membersAdded){
        message.membersAdded.forEach(function (identity) {
            if (identity.id === message.address.bot.id) {
                var reply = new builder.Message()
                    .address(message.address)
                    .text('Hola!, Bienvenido al Banco');
                bot.send(reply);
                //builder.Prompts.choice(dialog.session,'Selecciona una de las siguientes opciones: ', mnu, { listStyle :  builder.ListStyle.button });
                //bot.send(msg);
                //var promp = new builder.PromptChoice();
                //builder.Prompts.choice(session, 'Selecciona una de las siguientes opciones: ', mnu, { listStyle :  builder.ListStyle.button });
                //bot.send(promp);
            }
        });
    }
});

dialog.matches('SaludarEmpezar', function (session, results) {
    session.send('Hola ¿En que puedo ayudarte?');
});

// Esta función se ejecuta cuando el Intent == ordenarTaxi
dialog.matches('OrdenarPedido', [
    function (session, args, next) {
        //builder.Prompts.text(session, '¿A dónde envío tu pedido?');
        session.conversationData.pizzas = ['Carbonara', 'Barbacoa', 'Margarita', 'Pepperoni', 'Especialidad'];
        const entityPizza = builder.EntityRecognizer.findEntity(args.entities, 'producto');
        var match = null;
        session.conversationData.product = null;

        if (entityPizza) {
            match = builder.EntityRecognizer.findBestMatch(session.conversationData.pizzas, entityPizza.entity);
            session.conversationData.product = match;
        }
    
        if (!match) {
            /*
            var tarjetas = [];
            session.conversationData.pizzas.forEach(function(item){
                var heroCard = new builder.HeroCard(session)
                .title('Pizzas')
                .subtitle(item)
                .images([
                    builder.CardImage.create(session, 'https://media.licdn.com/mpr/mpr/shrinknp_200_200/p/4/005/09f/0c4/38c06ca.jpg')
                ])
                .buttons([
                    builder.CardAction.openUrl(session, 'https://www.facebook.com/jtaborga', 'Ver perfil')
                ]);
                
                tarjetas.push(heroCard);
            });*/

            // Creamos un array de tarjetas
            //var tarjetas = [heroCard1, heroCard2];
        
            // Adjuntamos la tarjeta al mensaje
            //var msj = new builder.Message(session).attachmentLayout(builder.AttachmentLayout.carousel).attachments(tarjetas);
            //session.send(msj);
            
            builder.Prompts.choice(session, 'Ahora mismo tenemos estas pizzas disponibles, ¿Cual te gustaría probar?', session.conversationData.pizzas, { listStyle :  builder.ListStyle.list });
        } else {
            next({  response: match });
        }
    },
    function(session, args){
        match = builder.EntityRecognizer.findBestMatch(session.conversationData.pizzas, args.response.entity);
        session.conversationData.product = match.entity;
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

dialog.matches('CrearCuenta', [
    function (session, args, next) {
        session.beginDialog('/anversoCarnet');    
    },
    function(session, args, next){
        session.beginDialog('/reversoCarnet');
    },
    function(session, args, next){
        builder.Prompts.choice(session, "Elije 1 Opción:", 'Continuar|Cancelar', { listStyle: builder.ListStyle.list });
    },
    function (session, results) {
        switch (results.response.index) {
            case 0:
                session.send('Se ha iniciado su apertura de cuenta.');
                break;
            case 1:
                session.beginDialog('CancelarPedido');
                break;
            default:
                session.endDialog();
                break;
        }
    }
]);

dialog.matches('OrigenBot', [
    function (session, args, next) {
        session.send('Soy un conjunto de lineas de código perdidas en la inmensidad de la internet.');
    }
]);

dialog.matches('CreadorBot', [
    function (session, args, next) {
        session.sendTyping();

        var heroCard = new builder.HeroCard(session)
        .title('Mi Creador')
        .subtitle('Ing. Jorge Taborga')
        .text('Síguelo en Twitter: @jtaborga')
        .images([
            builder.CardImage.create(session, 'https://media.licdn.com/mpr/mpr/shrinknp_200_200/p/4/005/09f/0c4/38c06ca.jpg')
        ])
        .buttons([
            builder.CardAction.openUrl(session, 'https://www.facebook.com/jtaborga', 'Ver perfil')
        ]);

        // Adjuntamos la tarjeta al mensaje
        var msj = new builder.Message(session).addAttachment(heroCard);

        setTimeout(function () {
            session.send(msj);
        }, 3000);
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

bot.dialog('/anversoCarnet', [
    function (session){
        builder.Prompts.text(session, 'Enviame la foto del anverso de tu carnet');
    },
    function (session, results, next){
        if (hasImageAttachment(session)) {
            var stream = getImageStreamFromMessage(session.message);
            captionService
                .getCaptionFromStream(stream)
                .then(function (caption) { handleSuccessResponse(session, caption); })
                .catch(function (error) { handleErrorResponse(session, error); });
        } else {
            var imageUrl = parseAnchorTag(session.message.text) || (validUrl.isUri(session.message.text) ? session.message.text : null);
            if (imageUrl) {
                captionService
                    .getCaptionFromUrl(imageUrl)
                    .then(function (caption) { handleSuccessResponse(session, caption); })
                    .catch(function (error) { handleErrorResponse(session, error); });
            } else {
                session.send('¿Estas seguro que incluiste una imagen? También puedes enviarme la url de una imagen.');
            }
        }

        session.endDialogWithResult(results);
    }
]);

bot.dialog('/reversoCarnet', [
    function (session){
        builder.Prompts.text(session, 'Enviame la foto del reverso de tu carnet');
    },
    function (session, results){
        if (hasImageAttachment(session)) {
            var stream = getImageStreamFromMessage(session.message);
            captionService
                .getCaptionFromStream(stream)
                .then(function (caption) { handleSuccessResponse(session, caption); })
                .catch(function (error) { handleErrorResponse(session, error); });
        } else {
            var imageUrl = parseAnchorTag(session.message.text) || (validUrl.isUri(session.message.text) ? session.message.text : null);
            if (imageUrl) {
                captionService
                    .getCaptionFromUrl(imageUrl)
                    .then(function (caption) { handleSuccessResponse(session, caption); })
                    .catch(function (error) { handleErrorResponse(session, error); });
            } else {
                session.send('¿Estas seguro que incluiste una imagen? También puedes enviarme la url de una imagen.');
            }
        }

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


//=========================================================
// Utilities
//=========================================================
function hasImageAttachment(session) {
    return session.message.attachments.length > 0 &&
        session.message.attachments[0].contentType.indexOf('image') !== -1;
}

function getImageStreamFromMessage(message) {
    var headers = {};
    var attachment = message.attachments[0];
    if (checkRequiresToken(message)) {
        // The Skype attachment URLs are secured by JwtToken,
        // you should set the JwtToken of your bot as the authorization header for the GET request your bot initiates to fetch the image.
        // https://github.com/Microsoft/BotBuilder/issues/662
        connector.getAccessToken(function (error, token) {
            var tok = token;
            headers['Authorization'] = 'Bearer ' + token;
            headers['Content-Type'] = 'application/octet-stream';

            return needle.get(attachment.contentUrl, { headers: headers });
        });
    }

    headers['Content-Type'] = attachment.contentType;
    return needle.get(attachment.contentUrl, { headers: headers });
}

function checkRequiresToken(message) {
    return message.source === 'skype' || message.source === 'msteams';
}

/**
 * Gets the href value in an anchor element.
 * Skype transforms raw urls to html. Here we extract the href value from the url
 * @param {string} input Anchor Tag
 * @return {string} Url matched or null
 */
function parseAnchorTag(input) {
    var match = input.match('^<a href=\"([^\"]*)\">[^<]*</a>$');
    if (match && match[1]) {
        return match[1];
    }

    return null;
}

//=========================================================
// Response Handling
//=========================================================
function handleSuccessResponse(session, caption) {
    if (caption) {
        session.send(caption);
    }
    else {
        session.send('No pude identificar los datos correctamente.');
    }

}

function handleErrorResponse(session, error) {
    var clientErrorMessage = 'Oops! Something went wrong. Try again later.';
    if (error.message && error.message.indexOf('Access denied') > -1) {
        clientErrorMessage += "\n" + error.message;
    }

    console.error(error);
    session.send(clientErrorMessage);
}