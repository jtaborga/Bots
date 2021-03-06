// The exported functions in this module makes a call to Microsoft Cognitive Service Computer Vision API and return caption
// description if found. Note: you can do more advanced functionalities like checking
// the confidence score of the caption. For more info checkout the API documentation:
// https://www.microsoft.com/cognitive-services/en-us/Computer-Vision-API/documentation/AnalyzeImage

var request = require('request').defaults({ encoding: null });

/** 
 *  Gets the caption of the image from an image stream
 * @param {stream} stream The stream to an image.
 * @return {Promise} Promise with caption string if succeeded, error otherwise
 */
exports.getCaptionFromStream = function (stream) {
    return new Promise(
        function (resolve, reject) {
            var requestData = {
                url: process.env.VISION_URL,
                encoding: 'binary',
                json: true,
                headers: {
                    'Ocp-Apim-Subscription-Key': process.env.MICROSOFT_VISION_API_KEY,
                    'content-type': 'application/octet-stream'
                }
            };

            stream.pipe(request.post(requestData, function (error, response, body) {
                if (error) {
                    reject(error);
                } else if (response.statusCode !== 200) {
                    reject(body);
                } else {
                    resolve(extractCaption(JSON.parse(body)));
                }
            }));
        }
    );
};

/** 
 * Gets the caption of the image from an image URL
 * @param {string} url The URL to an image.
 * @return {Promise} Promise with caption string if succeeded, error otherwise
 */
exports.getCaptionFromUrl = function (url) {
    return new Promise(
        function (resolve, reject) {
            var requestData = {
                url: process.env.VISION_URL,
                json: { 'url': url },
                headers: {
                    'Ocp-Apim-Subscription-Key': process.env.MICROSOFT_VISION_API_KEY,
                    'content-type': 'application/json'
                }
            };

            request.post(requestData, function (error, response, body) {
                if (error) {
                    reject(error);
                }
                else if (response.statusCode !== 200) {
                    reject(body);
                }
                else {
                    resolve(extractCaption(body));
                }
            });
        }
    );
};

/**
 * Extracts the caption description from the response of the Vision API
 * @param {Object} body Response of the Vision API
 * @return {string} Description if caption found, null otherwise.
 */
function extractCaption(body) {
    /*if (body && body.regions && body.regions.boundingBox && body.regions.boundingBox.lines.length) {
        return body.regions.boundingBox.lines.words[0].text;
    }*/
    var txt = "";

    if (body.regions.length){
        var data = body['regions'][1].lines[0].words[0].text;
        if(data.length > 3){
            txt = processAnverso(body);
        }else{
            txt = processReverso(body);
        }

        return txt;
    }

    return null;
}

function processReverso(body) {
    if (body.regions.length){
        var regions = body;
        var txt = "Tu nombre completo es:";

        var data = regions['regions'][0].lines[4].words;
        var fecnac = regions['regions'][0].lines[5].words;
        var reg = regions['regions'][0].lines[6].words;

        for (var index = 1; index < data.length; index++) {
            var element = data[index];
            if(element.text){
                txt += element.text + " ";
            }
        }

        txt += "<br />Nacido el: ";

        for (var index = 1; index < fecnac.length; index++) {
            var element = fecnac[index];
            if(element.text){
                txt += element.text + " ";
            }
        }

        txt += "<br />En: ";

        for (var index = 1; index < reg.length; index++) {
            var element = reg[index];
            if(element.text){
                txt += element.text + " ";
            }
        }

        return txt;//JSON.stringify(data, null, 2);
    }

    return null;
    
}

function processAnverso(body) {
    var txt = "Tu número de Cédula de Identidad es: ";
    var num = body['regions'][1].lines[0].words[0];

    if (body.regions.length){
        txt += num.text;


        return txt;//JSON.stringify(data, null, 2);
    }

    return null;
}