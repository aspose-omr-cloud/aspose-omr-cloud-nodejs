api = require('..');
StorageApi = require('asposestoragecloud');
path = require('path');
fs = require('fs');
os = require('os');

class Storage {
    constructor(AppSID, AppKey, basePath) {
        this.storageApi = new StorageApi({'appSid': AppSID,'apiKey': AppKey, baseURI: basePath, debug : false});
    }
    /**
     *
     * @summary Uploads file to storage
     * @param localFilePath Local file path
     * @param remoteFilePath Remote file path
     */
    uploadFile(localFilePath, remoteFilePath)  {
        return new Promise((resolve, reject) => {
            if (remoteFilePath.length === 0)
                remoteFilePath = path.basename(localFilePath);
            console.log("Uploading " + localFilePath + " to " + remoteFilePath);
            this.storageApi.PutCreate(remoteFilePath, "", "", localFilePath, (result) => {
                if (result.status.toString().toUpperCase() !== "OK")
                    reject(result.status.toUpperCase());
                else
                    resolve(result.body);
            });
        });
    }
    /**
     *
     * @summary Downloads file from storage
     * @param filePath Remote file path
     */
    downloadFile(filePath)  {
        return new Promise((resolve, reject) => {
            this.storageApi.GetDownload(filePath, "", "", (result) => {
                if (result.status.toString().toUpperCase() !== "OK")
                    reject(result.status.toUpperCase());
                else
                    resolve(result.body);
            });
        });
    }

    /**
     *
     * @summary Checks if file exists on storage
     * @param path Remote file path
     */
    isExist(path)  {
        return new Promise((resolve, reject) => {
            this.storageApi.GetIsExist(path, "", "", (result) => {
                if (result.status.toString().toUpperCase() !== "OK")
                    reject(result.status.toUpperCase());
                else
                    resolve(result.body.FileExist);
            });
        });
    }

    /**
     *
     * @summary Creates remote folder
     * @param path Remote folder path
     */
    createFolder(folderPath)  {
        return this.isExist(folderPath)
            .then((response) => new Promise((resolve, reject) => {
                if (!response.IsExist) {
                    this.storageApi.PutCreateFolder(folderPath, "", "", (result) => {
                        if (result.status.toString().toUpperCase() !== "OK")
                            reject(result.status.toUpperCase());
                        else
                            resolve(result.body);
                    });
                } else resolve(response.body);
            }));
    }
}

class OmrDemo {
    constructor() {
        /*
        * File with dictionary for configuration in JSON format
        * The config file should be looked like:
        *  {
        *     "app_key"  : "xxxxx",
        *     "app_sid"   : "xxx-xxx-xxx-xxx-xxx",
        *     "base_path" : "https://api.aspose.cloud/v1.1",
        *     "data_folder" : "Data"
        *  }
        * Provide your own app_key and app_sid, which you can receive by registering at Aspose Cloud Dashboard (https://dashboard.aspose.cloud/)
        */
        this.configFileName = "test_config.json";
        this.demoDataSubmoduleName = "aspose-omr-cloud-demo-data"

        this.pathToOutput = "./Temp";
        this.logosFolderName = "Logos";
        this.logoFiles = ["logo1.jpg", "logo2.png"];
        this.userImages = ['photo.jpg', 'scan.jpg']
        this.templateName = 'Aspose_test';
        this.templateDstName = this.templateName + '.txt';
        this.loadConfig();

        this.storage = new Storage(this.AppSID, this.AppKey, this.BasePath);
        this.omrApi = new api.OmrApi(this.AppSID, this.AppKey, this.BasePath);
    }

    /**
     *
     * @summary Load config from local file system
     */
    loadConfig() {
        let dataFolderBase = path.resolve();
        let dataFolderBaseOld = '';
        let configFileRelativePath = path.join(this.demoDataSubmoduleName, this.configFileName);
        let configFilePath = null;

        while (!fs.existsSync(path.resolve(dataFolderBase, configFileRelativePath)) && dataFolderBaseOld !== dataFolderBase) {
            dataFolderBaseOld = dataFolderBase;
            dataFolderBase = path.resolve(dataFolderBase, '..');
        }
        if (!fs.existsSync(path.resolve(dataFolderBase, configFileRelativePath)))
            throw new Error("Config file not found " + this.configFileName);
        else configFilePath = path.resolve(dataFolderBase, configFileRelativePath);
        let config = JSON.parse(fs.readFileSync(configFilePath));
        this.AppSID = config.app_sid;
        this.AppKey = config.app_key;
        this.BasePath = config.base_path;
        this.dataFolder = path.resolve(path.dirname(configFilePath), config.data_folder);
    }

    /**
     *
     * @summary Retrieves full file path, located in data folder
     * @param fileName File name
     */
    dataFilePath(fileName) {
        return path.resolve(this.dataFolder, fileName);
    }

    /**
     *
     * @summary Uploads demo files to the Storage
     */
    uploadDemoFiles() {
        return this.storage.createFolder(this.logosFolderName)
            .then(() => {
                let p = [];
                for (let fileName of this.logoFiles) {
                    let filePath = this.dataFilePath(fileName);
                    let remoteFilePath = this.logosFolderName + '/' + fileName;
                    p.push(this.storage.uploadFile(filePath, remoteFilePath));
                }
                return Promise.all(p);
            });
    }

    /**
     *
     * @summary Generates template
     * @param templateFilePath Template file path on local file system
     */
    generateTemplate(templateFilePath) {
        return this.storage.uploadFile(templateFilePath, "")
            .then(() => {
                let templateName = path.basename(templateFilePath);
                let param = new api.OMRFunctionParam();
                param.functionParam = JSON.stringify({"ExtraStoragePath" : this.logosFolderName});
                return this.omrApi.postRunOmrTask(templateName, "GenerateTemplate", param);
            });
    }

    /**
     *
     * @summary Corrects template
     * @param templateFile Template file path on local file system
     * @param imageFilePath Image file path on local file system
     */
    correctTemplate(templateFilePath, imageFilePath) {
        return this.storage.uploadFile(imageFilePath, "")
            .then(() => {
                let imageName = path.basename(imageFilePath);
                let param = new api.OMRFunctionParam();
                param.functionParam = this.serializeFiles([templateFilePath]);
                return this.omrApi.postRunOmrTask(imageName, "CorrectTemplate", param);
            });
    }

    /**
     *
     * @summary Finalizes template
     * @param templateId Template Identifier
     * @param correctedTemplateFilePath Corrected template file path on local file system
     * @returns Promise
     */
    finalizeTemplate(templateId, correctedTemplateFilePath) {
        return this.storage.uploadFile(correctedTemplateFilePath, "")
            .then(() => {
                let correctedTemplateFileName = path.basename(correctedTemplateFilePath);
                let param = new api.OMRFunctionParam();
                param.functionParam = templateId;
                return this.omrApi.postRunOmrTask(correctedTemplateFileName, "FinalizeTemplate", param);
            });
    }

    /**
     *
     * @summary Recognizes image
     * @param templateId Template Identifier
     * @param imagePath Image file path on local file system
     * @returns Promise
     */
    recognizeImage(templateId, imagePath) {
        return this.storage.uploadFile(imagePath, "")
            .then(() => {
                let imageFileName = path.basename(imagePath);
                let param = new api.OMRFunctionParam();
                param.functionParam = templateId;
                return this.omrApi.postRunOmrTask(imageFileName, "RecognizeImage", param);
            });
    }

    /**
     *
     * @summary Validates image (Correct and Finalize)
     * @param templateFilePath Template file path
     * @param imageFilePath Image file path on local file system
     * @returns Promise
     */
    validateTemplate(templateFilePath, imageFilePath) {
        console.log("CorrectTemplate ... ");
        return this.correctTemplate(templateFilePath, imageFilePath)
            .then(({response, body}) => {
            let correctedTemplateFilePath = '', templateId = body.payload.result.templateId;
            for (let filePath of this.deserializeFiles(body.payload.result.responseFiles, this.pathToOutput)) {
                if (path.extname(filePath).toLocaleLowerCase().endsWith('omrcr'))
                    correctedTemplateFilePath = filePath;
            }
            return Promise.resolve({correctedTemplateFilePath : correctedTemplateFilePath, templateId : templateId});
        })
        .then(({correctedTemplateFilePath, templateId}) => {
            console.log("FinalizeTemplate ...");
            return this.finalizeTemplate(templateId, correctedTemplateFilePath)
        });
    }

    /**
     *
     * @summary Deserialize file encoded in fileInfo to folder dstPath
     * @param fileInfo File information object
     * @param dstPath Destination path
     * @returns file paths on local file system
     */
    deserializeFile(fileInfo, dstPath) {
        if (!fs.existsSync(dstPath))
            fs.mkdirSync(dstPath);

        let dstFileName = path.resolve(dstPath, fileInfo.name);
        fs.writeFileSync(dstFileName, new Buffer(fileInfo.data, 'base64'));
        return dstFileName;
    }

    /**
     *
     * @summary Deserialize files from files to folder dstPath
     * @param files array of fileInfo objects
     * @param dstPath Destination path
     * @returns array of file paths on local file system
     */
    deserializeFiles(files, dstPath) {
        let result = [];
        for (let fileInfo of files)
            result.push(this.deserializeFile(fileInfo, dstPath));
        return result;
    }

    /**
     *
     * @summary Serialize files to JSON object
     * @param filePaths array of input file paths
     * @returns JSON string
     */
    serializeFiles(filePaths) {
        let files = [];
        for (let filePath of filePaths)
            files.push({
                'Name': path.basename(filePath)
                , 'Size': fs.statSync(filePath).size
                , 'Data': new Buffer(fs.readFileSync(filePath)).toString('base64')
            });
        return JSON.stringify({'Files' : files});
    }

    /**
     *
     * @summary Executes OMR Demo
     * @returns Promise
     */
    performDemo() {
        console.log("Generate Template ...");
        return this.generateTemplate(this.dataFilePath(this.templateDstName))
            .then(({response, body}) => {
                let templateFilePath = '', imageFilePath = '';
                for (let filePath of this.deserializeFiles(body.payload.result.responseFiles, this.pathToOutput)) {
                    if (path.extname(filePath).toLocaleLowerCase().endsWith('omr'))
                        templateFilePath = filePath;
                    else if (path.extname(filePath).toLocaleLowerCase().endsWith('png'))
                        imageFilePath = filePath;
                }
                return Promise.resolve({templateFilePath : templateFilePath, imageFilePath : imageFilePath});
            })
            .then(({templateFilePath, imageFilePath}) => this.validateTemplate(templateFilePath, imageFilePath))
            .then(({response, body}) => {
                let p = [];
                let templateId = body.payload.result.templateId;
                console.log("RecognizeImage ..." + templateId);
                for(let userImageFileName of this.userImages) {
                    p.push(this.recognizeImage(templateId, this.dataFilePath(userImageFileName) ));
                }
                return Promise.all(p);
            })
            .then((recognizeImageResults) => {
                console.log("------ R E S U L T ------");
                for(let {response, body} of recognizeImageResults) {
                    for (let filePath of this.deserializeFiles(body.payload.result.responseFiles, this.pathToOutput)) {
                        if (path.extname(filePath).toLocaleLowerCase().endsWith('dat'))
                            console.log('Output file ' + filePath);
                    }
                }
            });
    }
}

demo = new OmrDemo();
console.log("Uploading demo files...");
demo.uploadDemoFiles()
    .then(() => demo.performDemo())
    .then(() => {
        console.log("Demo Complete");
    }).catch((error) => {
        if (typeof error === 'string')
            console.log("ERROR " + error);
        else if (typeof error === 'object') {
            console.log("ERROR : Status Code " + error.response.statusCode);
            console.log("ERROR : Error Code " + error.response.body.Error.Code);
            console.log("ERROR : Error Message " + error.response.body.Message);
        }
    });
