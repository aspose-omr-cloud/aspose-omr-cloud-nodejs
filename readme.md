# asposeomrcloud

>Aspose.OMR for Cloud is a REST API that helps you to perform optical mark recognition in the cloud. You can get binaries to start working immediately and recognize various OMR forms. Developers can embed optical recognition in any type of application to extract data from images of tests, exams, questionnaires, surveys, etc. In the repository you can find examples on how to start using Aspose.OMR API in your project.

## Requirements.

NodeJS v4 or v8

## Installation

You need to clone `asposeomrcloud` and run

```sh
npm install && npm run-script build
```

## Usage
```javascript
api = require('<path to asposeomrcloud>');
```
## Getting Started

Please follow the [installation](#installation) instruction and execute the following JavaScript code:

```javascript

api = require('.');

// You can acquire App SID and App Key by registrating at Aspose Cloud Dashboard https://dashboard.aspose.cloud
APP_KEY = 'xxxxx'
APP_SID = 'xxxxx'

omrApi = new api.OmrApi(APP_SID, APP_KEY, 'https://api.aspose.cloud/v1.1');
param = new api.OMRFunctionParam();
param.functionParam = JSON.stringify({'ExtraStoragePath' : 'Logos'});
omrApi.postRunOmrTask('Aspose_test.txt', "GenerateTemplate", param)
.then(() => console.log('OK'))
.catch((error) => {
        if (typeof error === 'string')
            console.log("ERROR " + error);
        else if (typeof error === 'object') {
            console.log("ERROR : Status Code " + error.response.statusCode);
            console.log("ERROR : Error Message " + error.response.body);
        }
});

```


## Authorization

Library uses OAUTH2 internally

## Author

Aspose Pty Ltd (https://www.aspose.com)


