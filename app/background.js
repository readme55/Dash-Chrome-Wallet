// TODO: test identity stuff, bc much changes before next commit

var curMnemonic = null; // must be null for dashjs init
var curAddress = '';
var curBalance = '';
var curIdentityId = '';
var curName = '';
var curSwitch = false;

var sdk = null;
var sdkOpts = {};
var platform = null;
var curApps = '';
var tmpIdentity = {};  //check remove

var curIdentityHDPrivKey = {};  // TODO: testing
var curIdentityPrivKey = '';
var curIdentityPubKey = '';
var curIdentityAddress = '';

var connectTries = 0;
const connectMaxRetries = 3;

var pollSdk = null;
var curDappRequests = ["blub"];


////////////////////////////////////
// development environment settings:
// curMnemonic = 'liar fee island situate deal exotic flat direct save bag fiscal news';
// curAddress = 'yPDmTBtZd4sqMW6gUkm8MNWLu9kFF4DEji';
// curBalance = '1';
// curIdentityId = '45xcVv3zQnsdZTsCYiS1RfCM7oWErnXpeCWZEK5EZM2W';
// chrome.storage.local.set({ mnemonic: curMnemonic });
// chrome.storage.local.set({ address: curAddress });
// chrome.storage.local.set({ balance: curBalance });
// chrome.storage.local.set({ identityId: curIdentityId });

// productive environment settings:
sdkOpts.network = 'testnet';
const pContractID = "mA1kafwtR8HGoZamz72fmUWGGXKjDFLqmirtZbJYYoT";
const pRecordLocator = 'myContract.message';
const pDocument = "message";
pTarget = curIdentityId;

////////////////////////////////////

function connect() {
  return new Promise((resolve, reject) => {
    try {
      connectTries++;
      sdkOpts.mnemonic = curMnemonic;
      sdkOpts.apps = curApps;
      console.log("SDK Init")
      sdk = new Dash.Client(sdkOpts);
      sdk.isReady().then(() => {
        console.log('connected after', connectTries, 'tries');
        connectTries = 0;
        resolve();
      })
        .catch((e) => {
          console.log('error connecting to sdk', e);
          reject(e);
        });
    }
    catch (e) {
      console.log('error connecting: ', e);

      if (connectTries < connectMaxRetries) {
        console.log("retrying connect")
        connect();
      }
      else {
        console.log('error connecting after', connectTries, 'tries');
        reject(e);
      }
    }
  });
}

function disconnect() {
  return new Promise((resolve, reject) => {
    try {
      if (sdk != undefined) {
        console.log('disconnecting sdk:')
        sdk.disconnect().then(() => {
          console.log('SUCCESS')
          sdk = null;
          resolve();
        })
          .catch((e) => {
            console.log('FAIL')
            reject(e)
          });
      }
    }
    catch (e) {
      reject(e);
    }
  });
}

function getLocalStorage(arrKeys) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get(arrKeys, function (result) {
        resolve(result);
      });
    }
    catch (e) {
      console.log('Erroring  getting values for', key, 'from local storage');
      reject(e);
    }
  });
}

// DEBUG
// chrome.storage.local.get("mnemonic", function (result) {
//   console.log("log");
//   console.log(result.mnemonic);
//   if(result.mnemonic == '') {console.log("empty string")}
//   if(result.mnemonic == undefined) {console.log("undefined")}
// });

chrome.runtime.onInstalled.addListener(function () {
  console.log("Dash Chrome-Wallet installed.");

  // check for fresh install with no set cookies
  var testCookie;
  chrome.storage.local.get("mnemonic", function (result) {
    testCookie = result.mnemonic;
  });
  if (testCookie == undefined) {
    console.log("No Cookies detected, initializing.")
    chrome.storage.local.set({ mnemonic: '' }); // must be '' for popup.js
    chrome.storage.local.set({ address: '' });
    chrome.storage.local.set({ balance: '' });
    chrome.storage.local.set({ identityId: '' });
    chrome.storage.local.set({ name: '' });
    chrome.storage.local.set({ switch: '' });
  } else {
    console.log("Cookies detected.")
  }
  // chrome.storage.local.set({ tab: chrome.extension.getURL("popup.html") });
});

// set curMnemonic for connect() function
chrome.storage.local.get('mnemonic', function (data) {
  if (data.mnemonic != '' && data.mnemonic != undefined) { // first run: onInstalled not finished when reached here -> so undefined
    curMnemonic = data.mnemonic;
    console.log(data.mnemonic + "blub")
  }
  // else if (curMnemonic == undefined)  // TODO: test if still needed - testing
  //   curMnemonic = null;
});


////////////// experimental code for dapp signing - some stuff hardcoded for now ////////////

async function getIdentityKeys() {
  curIdentityHDPrivKey = await sdk.account.getIdentityHDKey(0, 'user')
  console.log("curIdentHDPrivKey: " + curIdentityHDPrivKey)
  curIdentityPrivKey = curIdentityHDPrivKey.privateKey;
  var pk = curIdentityPrivKey;
  curIdentityPublicKey = curIdentityHDPrivKey.publicKey;
  var pubk = curIdentityPublicKey;
  console.log("IdentityPrivateKey " + curIdentityPrivKey)
  // those are identical after converting toAddress()
  console.log("IdentityPublicKey.toAddress() : " + pubk.toAddress().toString())
  console.log("identityPrivateKey.toAddress: " + pk.toAddress().toString())

}

async function signMsg(msg) {
  try {
    // const message = "readme Fri, 03 Apr 2020 16:50:59 GMT"; // TODO
    const messageDash = new Dash.Core.Message(msg);
    console.log("message: " + messageDash);
    console.log("curIdentPrivKey: " + curIdentityPrivKey)

    // Cannot read property 'sign' of undefined
    // const signedMsg = await pollSdk.account.sign(messageDash, curIdentPrivKey);
    var signedMsg = await messageDash.sign(curIdentityPrivKey);

    console.log("sign(msg, privKey): " + signedMsg)

    const verify = await messageDash.verify(curIdentityPrivKey.toAddress().toString(), signedMsg.toString());
    console.log("verify(identAddr, signed msg):  " + verify)
  } catch (e) {
    console.log("caught signMsg " + e)
  } finally {
    return signedMsg;
  }
}

async function submitDocument(msg) {

  try {
    var tidentity = await pollSdk.platform.identities.get(curIdentityId);

    var docProperties = {
      message: msg
    }
    // Create the note document
    var noteDocument = await pollSdk.platform.documents.create(
      pRecordLocator,
      tidentity,
      docProperties,
    );

    const documentBatch = {
      create: [noteDocument],
    	replace: [],
    	delete: [],
    }

    // Sign and submit the document
    // TypeError: Cannot read property 'getIdentityHDKey' of undefined
    console.log(tidentity)
    console.log(noteDocument)
    await pollSdk.platform.documents.broadcast(documentBatch, tidentity);
  } catch (e) {
    console.error('Something went wrong:', e);
  } finally {
    console.log("submitted login document with message: " + msg)
  }
  return true;
}


async function polling() {

  // TODO: remove later
  getIdentityKeys()

  // TODO remove when DashJS removed curApps
  var psdkOpts = {};
  psdkOpts.network = 'testnet';
  psdkOpts.mnemonic = curMnemonic;
  curApps = '{ "myContract" : { "contractId" : "' + pContractID + '" } }';
  curApps = JSON.parse(curApps);
  psdkOpts.apps = curApps;

  var nStart = 1;
  var pollLocator = "myContract." + pDocument;

  pollSdk = new Dash.Client(psdkOpts);
  await pollSdk.isReady();

  var reachedHead = false;

  while (curSwitch) {

    try {

      console.log("polling");

      var pollQuery = '{ "startAt" : "' + nStart + '" }';
      console.log(pollQuery)
      pollQuery = JSON.parse(pollQuery);
      const pollDoc = await pollSdk.platform.documents.get(pollLocator, pollQuery);

      if (pollDoc.length == 0 || reachedHead == false) {
        if (pollDoc.length == 0) {
          reachedHead = true;
          await new Promise(r => setTimeout(r, 5000));  // sleep x ms
        }
        nStart = nStart + pollDoc.length;
        continue;
      }
      console.log("polldoc length: " + pollDoc.length)

      for (let index = 0; index < pollDoc.length; ++index) {
        var requestMsg = pollDoc[index].data.identityid;
        if (requestMsg == null) return;

        if (requestMsg.startsWith(pTarget)) {
          console.log("Found message starting with IdentityId");
          curDappRequests.push(requestMsg);

          var views = chrome.extension.getViews({ type: "popup" });
          //views => [] //popup is closed
          //views => [DOMWindow] //popup is open
          console.log(views)

          // OS Request-DappSigning Notification
          chrome.notifications.create({
            "type": "basic",
            "iconUrl": chrome.extension.getURL("img/icon128.png"),
            "title": "Request",
            "message": "Received message with your IdentityID. Confirm Request?"
          });
          chrome.notifications.onClicked.addListener(async (id) => {
            dappSigningDialog();
            chrome.notifications.clear(id);
          });

          // chrome.notifications.onButtonClicked.addListener(async (id, index) => {
          //   chrome.notifications.clear(id);
          //   console.log("You chose: " + buttons[index].title);
          //   console.log(requestMsg) // TODO: test what happens when 2 messages arrive before confirming anything
          //   if (buttons[index].title == "Yes") {
          //     var responseMsgSigned = await signMsg(requestMsg);
          //     console.log("responseMsgSigned: " + responseMsgSigned)
          //     await submitDocument(responseMsgSigned);
          //   }
          // });

          // Confirm Dialog
          // var bConfirm = confirm("Received message with your IdentityID. Confirm Response?");
          // if (bConfirm == false) {  // if pressed "No" in Dialog, abort and dont respond
          //   continue;
          // } else {  // sign response message with text of request message
          //   var responseMsgSigned = await signMsg(requestMsg);
          //   console.log("responseMsgSigned: " + responseMsgSigned)
          //   await submitDocument(responseMsgSigned);
          // }
        }
      }
      nStart = nStart + pollDoc.length;
      // await pollSdk.disconnect();

    } catch (e) {
      // NOTE: firefox not supporting buttons in notification, also not supporting alert+confirm dialog in background
      console.log("caught error polling " + e)
      // return;
    }
  }
  console.log("return")
  return;
}

async function setDappResponse(decision) {
  console.log(decision);
  if (decision == "confirm") {
    var responseMsgSigned = await signMsg(curDappRequests[0]);
    console.log("responseMsgSigned: " + responseMsgSigned)
    await submitDocument(responseMsgSigned);
  } else {

  }
};

function getDappRequests() {
  console.log("curdapprequest: " + curDappRequests[0])
  return curDappRequests;
}

function dappSigningDialog() {
  chrome.windows.create({
    url: chrome.extension.getURL('dialog.html'),
    type: 'popup',
    // focused: true, // not supported by firefox
    top: 300,
    left: 300,
    width: 510,
    height: 290
  });
}


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  try {
    if (request.greeting == 'importMnemonic') { curMnemonic = request.mnemonic; console.log(curMnemonic); }
    if (request.greeting == 'getDocuments') {
      curApps = '{ "myContract" : { "contractId" : "' + request.contractId + '" } }';
      curApps = JSON.parse(curApps);
    }
    // if (request.greeting == "switch") {
    //   (async function dappSigning() {
    //     curSwitch = request.switch;
    //     console.log("curSwitch: " + curSwitch)
    //     await chrome.storage.local.set({ switch: curSwitch });
    //     if (curSwitch) {
    //       polling();
    //     }
    //     // exit somehow or add "switch" case
    //   })();
    // }

    /////////////////// start switch - case ////////////////////

    connect().then(() => {

      switch (String(request.greeting)) {

        case "connect":
          (async function connect() {
            console.log('connect');
            sendResponse({ complete: true })
            // var alertWindow = 'alert("message")';
            // chrome.tabs.executeScript({ code: alertWindow });
          })()

          break;

        // case "dappSigningDialog":
        //   (function dappSigningDialog() {
        //     chrome.windows.create({
        //       url: chrome.extension.getURL('dialog.html'),
        //       type: 'popup',
        //       // focused: true,
        //       top: 300,
        //       left: 300,
        //       width: 510,
        //       height: 290
        //     });

        //   })()

        case "switch":
          (async function dappSigning() {
            curSwitch = request.switch;
            console.log("curSwitch: " + curSwitch)
            await chrome.storage.local.set({ switch: curSwitch });
            if (curSwitch) {
              polling();
            }
            sendResponse({ complete: true });
            disconnect();
          })();
          break


        case "createWallet":
          (async function createWallet() {
            console.log('createWallet');

            const mnemonic = await sdk.wallet.exportWallet();
            curMnemonic = mnemonic;
            const address = await sdk.account.getUnusedAddress();
            await chrome.storage.local.set({ mnemonic: mnemonic });
            // var savedMM = await getLocalStorage(['mnemonic']);
            await chrome.storage.local.set({ address: address.address });
            // var savedAddress = await getLocalStorage(['address']);
            await chrome.storage.local.set({ balance: '0' });
            // var savedBalance = await getLocalStorage(['balance']);

            // run automated faucet:
            // var xmlHttp = new XMLHttpRequest();
            // xmlHttp.open( "GET", "https://qetrgbsx30.execute-api.us-west-1.amazonaws.com/stage/?dashAddress=" + address, false ); // false for synchronous request
            // xmlHttp.send( null );
            // console.log(xmlHttp.responseText);
        
            sendResponse({ complete: true });
            disconnect();
          })();
          break;


        case "importMnemonic":

          (async function importMnemonic() {
            console.log('importMnemonic');
            curAddress = await sdk.account.getUnusedAddress().address;
            curBalance = ((await sdk.account.getTotalBalance()) / 100000000);

            getIdentityKeys();

            await chrome.storage.local.set({ mnemonic: curMnemonic });
            await chrome.storage.local.set({ address: curAddress });
            await chrome.storage.local.set({ balance: curBalance });
            // await chrome.storage.local.set({ identityId: curIdentityId });
            await chrome.storage.local.set({ identityId: "" });

            sendResponse({ complete: true });
            disconnect();
          })()
          break;


        case "getBalance":
          // TODO: use events api to auto update balance
          (async function getBalance() {
            console.log('getBalance');
            console.log(await sdk.account.getUnconfirmedBalance())
            console.log(await sdk.account.getTotalBalance())
            console.log(await sdk.account.getConfirmedBalance())

            await chrome.storage.local.set({ balance: ((await sdk.account.getTotalBalance()) / 100000000) });
            sendResponse({ complete: true });
            disconnect();
          })()
          break;


        case "sendFunds":
          (async function sendFunds() {
            console.log('sendFunds');
            var transaction = null;
            if (request.toAddress == '' && request.amount == '') {
              transaction = await sdk.account.createTransaction({
                recipient: 'yNPbcFfabtNmmxKdGwhHomdYfVs6gikbPf', // Evonet faucet
                satoshis: 100000000, // 1 Dash
              });
            }
            else if (request.toAddress != '' && request.amount != '') {
              var satAmount = request.amount * 100000000;
              transaction = await sdk.account.createTransaction({
                recipient: request.toAddress,
                satoshis: satAmount,
              });
            }
            console.dir(transaction)
            const result = await sdk.account.broadcastTransaction(transaction);
            console.log('Transaction broadcast!\nTransaction ID:', result);
            // TODO: this should be working, bug in DashJS i guess, using popup.js for now
            // await new Promise(r => setTimeout(r, 20000));  // sleep x ms
            // console.log(await sdk.account.getUnconfirmedBalance())
            // console.log(await sdk.account.getTotalBalance())
            // await chrome.storage.local.set({ balance: ((await sdk.account.getUnconfirmedBalance()) / 100000000) });
            sendResponse({ complete: true });
            disconnect();
          })()
          break;


        case "registerIdentity":
          (async function registerIdentity() {
            console.log('registerIdentity');
            // import identityID if given '<string>' from popup.js
            if (request.identityId != '') {
              tmpIdentity.id = request.identityId;
            }
            // create identity if given '' from popup.js
            else if (request.identityId == '') {
              tmpIdentity = await sdk.platform.identities.register(); // TODO: testing
            }
            console.log({ tmpidentity: tmpIdentity.id });
            curIdentityId = tmpIdentity.id;
            await chrome.storage.local.set({ identityId: tmpIdentity.id });
            getIdentityKeys();

            sendResponse({ complete: true });
            disconnect();
          })()
          break;


        case "registerName":
          (async function registerName() {
            console.log('registerName');
            curName = request.name;
            // TODO: bug when having several identitys, importing 1st and then registering name
            tmpIdentity = await sdk.platform.identities.get(curIdentityId);
            console.log(tmpIdentity)
            const nameRegistration = await sdk.platform.names.register(curName, tmpIdentity);
            console.log({ nameRegistration });
            await chrome.storage.local.set({ name: curName });
            sendResponse({ complete: true });
            disconnect();
          })()
          break;


        case "getDocuments":
          (async function getDocuments() {
            console.log('getDocuments');
            const recordLocator = "myContract." + request.documentName; // just use myContract for all

            var queryJson = JSON.parse(request.queryObject);
            const documents = await sdk.platform.documents.get(recordLocator, queryJson);
            console.log(documents);
            var documentJson = JSON.stringify(documents, null, 2)

            // todo: fix encoding warning in firefox
            let a = URL.createObjectURL(new Blob([documentJson]), { encoding: "UTF-8", type: "text/plain;charset=UTF-8" })

            chrome.windows.create({
              type: 'popup',
              url: a
            });
            // chrome.tabs.create({ url: a });

            // newWin = window.open(a, "Document Query", "width=800,height=500");

            sendResponse({ complete: true });
            disconnect();
          })()
          break;


        case "getContract":
          (async function getContract() {
            console.log('getContract');
            const contract = await sdk.platform.contracts.get(request.contractId);
            // const contract = await sdk.platform.contracts.get('77w8Xqn25HwJhjodrHW133aXhjuTsTv9ozQaYpSHACE3');
            console.dir({ contract }, { depth: 5 });
            var contractJson = JSON.stringify(contract, null, 2)

            let a = URL.createObjectURL(new Blob([contractJson]), { encoding: "UTF-8", type: "text/plain;charset=UTF-8" })

            chrome.windows.create({
              type: 'popup',
              url: a
            });
            // const newWin = window.open("about:blank", "Receive Contract", "width=800,height=500");
            // newWin.document.open();
            // newWin.document.write('<html><body><pre>' + contractJson + '</pre></body></html>');
            // newWin.document.close();
            sendResponse({ complete: true });
            disconnect();
          })()
          break;
          
          
        case "resetWallet":
          (async function resetWallet() {

          })()
          break;


        default:
          // error
          console.log('ERROR Unknown Message: ' + String(request.greeting));
          disconnect();
          break;
      }
    })
      .catch((e) => {
        console.log('ERROR CONNECTING', e);
        sendResponse({ complete: false });
        disconnect();
      });

  }

  catch (e) {
    console.log('error processing request: ', e);
  }
  finally {
    // return true from the event listener to indicate you wish to send a response asynchronously
    // (this will keep the message channel open to the other end until sendResponse is called).
    return true;
  }

});
