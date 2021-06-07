var curMnemonic = null; // must be null for dashjs init
var curAddress = '';
var curBalance = '';
var curIdentityId = '';
var curName = '';
var curSwitch = false;
var curSwitch2 = false;

var sdk = null;
var account = null;
var sdkOpts = {};
var psdkOpts = {};
var platform = null;
var curApps = '';
var psdkApps = '';
var tmpIdentity = {};  //check remove

var curIdentityHDPrivKey = {};
var curIdentityPrivKey = '';
var curIdentityPubKey = '';
var curIdentityAddress = '';
var curDocDomainID = '';
var curPin = Math.floor(Math.random() * 900000) + 100000;
// var curPin = '123456';
var curDocNr = 0;

var connectTries = 0;
const connectMaxRetries = 3;

var pollSdk = null;
var curDappRequests = [];

var uidpin_verified = false;

var dsHeader = '';
var dappDialogActive = false;

var wls = window.localStorage;

(function () {
  if (wls)
    console.log("Local Storage Supported")
  else {
    console.log("Local Storage Not Supported")
    throw ("Local Storage Not Supported")
  }
  //show number of objects stored
  // console.log(wls.length)

})();


////////////////////////////////////
//// development environment settings: Uncomment for static credentials in CW
//// IdentHDPrivKey: tprv8ofwmyJJyfdUwV62ezSCVZbpLLVfTTmKdmCkfbEfAhqh8H7tNkgbmjGccbfGVJvGjS1j6S5GZBu1AGQcCUq3eQDBLojGSTJ13Q5fDF4HXq4
// curMnemonic = 'amount deliver thunder trash stadium tunnel vital ladder organ slender way length';
// curAddress = 'yhYuPKxNDBuV5gAfhMUhKbHVB95at9Urgs';
// curBalance = '1';
// curIdentityId = 'EBvi3NdsEikoDUXrPZRgKNNVH67oJCKVzHoQYw7G4YYd';
// curName = 'readme'
// chrome.storage.local.set({ mnemonic: curMnemonic });
// chrome.storage.local.set({ address: curAddress });
// chrome.storage.local.set({ balance: curBalance });
// chrome.storage.local.set({ identityId: curIdentityId });
// chrome.storage.local.set({ name: curName });

sdkOpts.network = 'testnet';
const pContractName = 'myContract';
const msgContractName = 'msgContract';
const queryContractName = 'queryContract';  // is changed dynamic with every query
const submitContractName = 'submitContract'; // also dynamic

////////////////////////////////////
//// Dapp-Signing WDS contract constants and variables:
const pContractID = "DBVuaTbU8PY9weNrg8RZPerNnv4oEdRWwSa4qXUG7ji4";
var pRequestDocument = ["LoginRequest", "SignupRequest", "TweetRequest"];
const pRequestProp = "reference";
var pRequestTarget = '';
var loginResponseDocOpts = ['', '', ''];

// vendor credentials
const aliceDocDomainId = "2JwFfLfCk8m139U778HzLA315s8BDXEBARyWEbEnrdbs" // vendor, alice
const alicePublicKey = "Ag/YNnbAfG0IpNeH4pfMzgqIsgooR36s5MzzYJV76TpO"; // vendor, alice

const pResponseDocument = ["LoginResponse", "SignupResponse", "TweetResponse"];
const pResponseProp = "status";

////////////////////////////////////
///// Dapp Signing Simple (Push Notifications)
const messageContractId = "3oURAJACLdVnxdWzpjHL4m81nYTT81eQoLsiWAhXKmxw"
var pRequestDocument2 = ["message"];
const pRequestProp2Header = "header";
const pRequestProp2Ref = "reference";
// var pRequestTarget = '';
var messageSubmitContractID = [''];
var messageSubmitDocName = [''];
var messageSubmitDocContent = [''];
var messageSubmitContractCreation = [''];
var messageAmountTx = [''];
var messageAddrTx = [''];

//// DPNS-Contract for docID
const domainContractID = "76wgB8KBxLGhtEzn4Hp5zgheyzzpHYvfcWGLs69B2ahq";
const domainRequestDocument = "domain";

//// Vendor Details
// const vendorDocDomainId = "8FDzB5kcpXtFQcWACXck2akHHG4nR9G4mP6gqPBGZVSi" // vendor, mydapp
// const vendorPublicKey = "A0/qSE6tis4l6BtQlTXB2PHW+WV+Iy0rpF5hAvX8hDRz"; // vendor, mydapp

////////////////////////////////////

console.log("background.js starting");

// var manifestData = chrome.runtime.getManifest();
// console.log(manifestData.version);
// console.log(manifestData.name);
// console.dir(navigator.userAgent)
// console.dir(chrome.tabs)  
// console.dir(chrome.windows["WindowState"])

// Detect NWJS instance or Browser instance
if (chrome.windows["WindowState"].HIDDEN == "hidden") {
  console.log("Desktop NWJS Mode")
  chrome.tabs.query({}, function (tab) {
    chrome.tabs.update(tab[0].id, {
      url: chrome.extension.getURL("popup.html"),
    });
  })
} else if (chrome.windows["WindowState"].DOCKED == "docked") {
  console.log("Browser Extension Mode")
}

async function connect() {
  sdkOpts.network = 'testnet';
  sdkOpts.dapiAddresses = [
    '34.220.41.134',
    '18.236.216.191',
    '54.191.227.118',
  ];
  sdkOpts.wallet = {};
  sdkOpts.wallet.mnemonic = curMnemonic;
  // sdkOpts.wallet.adapter = localforage;
  sdkOpts.wallet.adapter = new LocalForageWrapper();
  sdkOpts.wallet.unsafeOptions = {};
  sdkOpts.wallet.unsafeOptions.skipSynchronizationBeforeHeight = 415000; // only sync from start of 2021
  sdkOpts.apps = curApps;
  console.log("SDK Init \nMnemonic: " + curMnemonic + " \ncurApps: " + curApps)
  
  try {
    // start testConnection-spinner to show its loading TODO use other bigger spinner and deactivate all input
    sdk = new Dash.Client(sdkOpts);
    account = await sdk.getWalletAccount();
    wls.setItem('connected', true)

    // await account.isReady();
    // register TX listener
    account.on('FETCHED/CONFIRMED_TRANSACTION', async (data) => {
      console.log('FETCHED/CONFIRMED_TRANSACTION');
      // console.log(data);
      // curBalance = ((await account.getTotalBalance()) / 100000000);
      curBalance = await account.getTotalBalance() / 100000000;
      wls.setItem('balance', curBalance);

      // send message to popup
      chrome.runtime.sendMessage({
        msg: "refresh balance"
      });
    });
    // var handler = function () {
    //   console.log('FETCHED/CONFIRMED_TRANSACTION');
    //   alert('clicked!');
    // };
    // account.on('FETCHED/CONFIRMED_TRANSACTION', handler);

  } catch (e) {
    console.log('error connecting sdk', e);
  } finally {
    // needed if popup stil open or nwjs instance
    chrome.runtime.sendMessage({
      msg: "stop ConnectionSpinner"
    });
  }
  console.log("FIN SDK Init")
  return true;
}

async function disconnect() {
  console.log("disconnect")
  try {
    await sdk.disconnect();
    account = null;
    wls.setItem('connected', false)

  } catch (e) {
    console.log('error disconnecting sdk', e);
  }
  console.log("FIN disconnect")
  return true;
}

// function connect() {
//   return new Promise((resolve, reject) => {
//     try {
//       connectTries++;
//       sdkOpts.mnemonic = curMnemonic;
//       sdkOpts.apps = curApps;
//       console.log("SDK Init " + curMnemonic)
//       sdk = new Dash.Client(sdkOpts);
//       sdk.isReady().then(() => {
//         console.log('connected after', connectTries, 'tries');
//         // getIdentityKeys()  // test, remove
//         connectTries = 0;
//         resolve();
//       })
//         .catch((e) => {
//           console.log('error connecting to sdk', e);
//           reject(e);
//         });
//     }
//     catch (e) {
//       console.log('error connecting: ', e);

//       if (connectTries < connectMaxRetries) {
//         console.log("retrying connect")
//         connect();
//       }
//       else {
//         console.log('error connecting after', connectTries, 'tries');
//         reject(e);
//       }
//     }
//   });
// }

// function disconnect() {
//   return new Promise((resolve, reject) => {
//     try {
//       if (sdk != undefined) {
//         console.log('disconnecting sdk:')
//         sdk.disconnect().then(() => {
//           console.log('SUCCESS')
//           sdk = null;
//           resolve();
//         })
//           .catch((e) => {
//             console.log('FAIL')
//             reject(e)
//           });
//       }
//     }
//     catch (e) {
//       reject(e);
//     }
//   });
// }

// function getLocalStorage(arrKeys) {
//   return new Promise((resolve, reject) => {
//     try {
//       chrome.storage.local.get(arrKeys, function (result) {
//         resolve(result);
//       });
//     }
//     catch (e) {
//       console.log('Erroring  getting values for', key, 'from local storage');
//       reject(e);
//     }
//   });
// }

// DEBUG
// chrome.storage.local.get("mnemonic", function (result) {
//   console.log("log");
//   console.log(result.mnemonic);
//   if(result.mnemonic == '') {console.log("empty string")}
//   if(result.mnemonic == undefined) {console.log("undefined")}
// });

chrome.runtime.onInstalled.addListener(async function () {
  console.log("Dash Chrome Wallet installed.");

  // check for fresh install with no set cookies
  var wlsTest = wls.getItem('mnemonic')
  if (wlsTest == null) {
    console.log("No Cookies detected, initializing.")
    wls.setItem('mnemonic', '') // must be '' for popup.js
    wls.setItem('address', '')
    wls.setItem('balance', '')
    wls.setItem('identityId', '')
    wls.setItem('name', '')
    // wls.setItem('switch', 'false')
    wls.setItem('pin', curPin)
    wls.setItem('switch2', false)
    wls.setItem('notification', false)
    wls.setItem('connected', false)
  } else {
    console.log("Cookies detected.")
  }
  console.log("Dash Chrome Wallet initialization complete.");
  // chrome.storage.local.set({ tab: chrome.extension.getURL("popup.html") });
});

var wlsMnemonic = wls.getItem('mnemonic');

// set curMnemonic for connect() function
if (wlsMnemonic != '' && wlsMnemonic != null) {
  curMnemonic = wlsMnemonic;
  console.log("Mnemonic successfully loaded: " + curMnemonic)
}
// chrome.storage.local.get('mnemonic', function (data) {
//   if (data.mnemonic != '' && data.mnemonic != undefined) { // first run: onInstalled not finished when reached here -> so undefined
//     curMnemonic = data.mnemonic;
//     console.log("Mnemonic successfully loaded: " + data.mnemonic)
//   }
//   else if (curMnemonic == undefined) { // TODO: test if still needed - shouldnt happen
//     console.log("No existing Mnemonic found.")
//     curMnemonic = null;
//   }
// });

// set all other data from cookies if exists TODO: check restart, scratch, continue
curAddress = wls.getItem('address')
console.log("address: " + curAddress)
curBalance = wls.getItem('balance')
curIdentityId = wls.getItem('identityId')
curName = wls.getItem('name')


// chrome.storage.local.get('address', function (data) {
//   curAddress = data.address;
//   console.log("address: " + curAddress)
// });
// chrome.storage.local.get('balance', function (data) {
//   curBalance = data.balance;
// });
// chrome.storage.local.get('identityId', function (data) {
//   curIdentityId = data.identityId;
// });
// chrome.storage.local.get('name', function (data) {
//   curName = data.name;
// });

// set switch to false on "browser load" - TODO: remove switch from cookies, check if still needed? i dont think so, switch2 missing here
// wls.setItem('switch', 'false')
wls.setItem('switch2', false)
wls.setItem('pin', curPin)
wls.setItem('notification', false)
wls.setItem('connected', false)


// chrome.storage.local.set({ switch: false });
// chrome.storage.local.set({ pin: curPin });




////////////// code for dapp signing v1 ////////////

async function getDefaultUsername() {
  
  var name = "";
  try {
    console.log("identityId: " + curIdentityId)
    // console.log(await sdk.platform.names.resolveByRecord('dashUniqueIdentityId', '6KofS1fhpLU7RhekrvemTKRzLG48551xZm3PmSWZrH4o'))
    var doc = await sdk.platform.names.resolveByRecord('dashUniqueIdentityId', curIdentityId);
    // console.log(doc[0].data.label);
    name = doc[0].data.label;
  } catch (e) {
    console.error('Something went wrong:', e);
  }
  
  return name;
}

async function getIdentityKeys() {
  console.log("start getIdentityKeys");
  // TODO: check if try..catch necessary
  curIdentityHDPrivKey = await account.identities.getIdentityHDKeyByIndex(0, 0);
  console.log("curIdentHDPrivKey: " + curIdentityHDPrivKey);
  curIdentityPrivKey = curIdentityHDPrivKey.privateKey;
  var pk = curIdentityPrivKey;
  curIdentityPublicKey = curIdentityHDPrivKey.publicKey;
  var pubk = curIdentityPublicKey;
  console.log("IdentityPrivateKey " + curIdentityPrivKey)
  // those are identical after converting toAddress()
  console.log("IdentityPublicKey.toAddress() : " + pubk.toAddress().toString())
  console.log("identityPrivateKey.toAddress: " + pk.toAddress().toString())

  //// encryption test
  // const hashedAndEncryptedUID_PIN = "eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6WzMsNzksMjM0LDcyLDc4LDE3MywxMzgsMjA2LDM3LDIzMiwyNyw4MCwxNDksNTMsMTkzLDIxNiwyNDEsMjE0LDI0OSwxMDEsMTI2LDM1LDQ1LDQzLDE2NCw5NCw5NywyLDI0NSwyNTIsMTMyLDUyLDExNSwxOTYsMTA2LDc2LDEzNSwyMjEsMjEzLDEsMjE3LDE4LDE3LDE1Nyw5MywxODUsMjA4LDIwMSwyMDcsMTgxLDE0MywxNzUsMTg2LDE3NywxMywyMzAsMTAxLDc2LDIyNiwxOTEsMTYwLDI1MCwyMjAsMzYsMjI1LDExOCwxOTYsODYsOTgsMTA5LDIxNywxMTEsMTgzLDc4LDExOSwzNywyNDgsMjMzLDU4LDQ0LDQ0LDIyMiwyNDUsMjMsMTIxLDgzLDIwOCwyNyw2MiwyNTAsMCwxMjMsMTQ0LDE2OSwxNTAsMTk3LDg4LDI4LDE2OSwyMjIsMzcsMjM1LDE2MiwyMCw1NSw5MSw5NCwyMDUsMjAyLDI4LDIzLDE4NCw3MCwyMTMsODAsMTQ2LDgwLDE5OCwxOTMsMjE0LDIyNiwyNTIsMTI3LDE0MiwxMjMsNzYsNjYsMTU2LDhdfQ=="
  // decrypted = DashmachineCrypto.decrypt('7e79092c94fddd676ad410b27793beda7e9394caa5d4de328b8838edf526edf4', hashedAndEncryptedUID_PIN, 'A0/qSE6tis4l6BtQlTXB2PHW+WV+Iy0rpF5hAvX8hDRz')
  // console.log("test DashMachine Output: " + decrypted.data);

  // var decrypted2 = DashmachineCrypto.decrypt('2f567b21e0f49de46653701dc3a7c65a0d5bb1070c6e71de966c60fbb603dd19', 'eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6WzMsNzksMjM0LDcyLDc4LDE3MywxMzgsMjA2LDM3LDIzMiwyNyw4MCwxNDksNTMsMTkzLDIxNiwyNDEsMjE0LDI0OSwxMDEsMTI2LDM1LDQ1LDQzLDE2NCw5NCw5NywyLDI0NSwyNTIsMTMyLDUyLDExNSwxNjQsNTAsMTUyLDE3MSwyNTQsMTg2LDIxMiwxNTUsMjA3LDI1MywyMjQsMjA4LDQsMTQ3LDI1LDE0OCwxMjMsMjYsMjQ5LDIzMywyMTcsMTM2LDE0NCwyMTMsOTcsNzAsODYsNjEsMTk2LDE1NywxNjksNiw5MCwyNTMsMTEwLDY3LDU5LDIzMSwxOTUsNTcsMjAzLDE5MiwxNzUsMjUxLDIzOSwyMSwxODYsMzAsMjAzLDExNywzOSwxNTcsNTAsMzUsNzAsMTc4LDQxLDQ5LDEzMCwzNSwxMzUsMTQsNSw0LDIwLDE0MiwxODksMTQ5LDE0NSw5OSwyMjEsNDMsNDcsMTQ3LDI1MywxMzIsNjMsMTg1LDI1NSwyMTYsMTg3LDEyLDE3LDczLDEwMywxNDYsMjQ5LDEyMSwxNTAsODgsNDgsMTI1LDcxLDE1NSwxNTgsMTE1XX0=', 'A0/qSE6tis4l6BtQlTXB2PHW+WV+Iy0rpF5hAvX8hDRz');
  // console.log("test DashMachine Output: " + decrypted2.data);
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
      status: msg
    }
    // Create the note document
    var noteDocument = await pollSdk.platform.documents.create(
      // pContractName + "." + pResponseDocument,
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

async function submitWdsResponseDocument(msg) {

  try {
    var tidentity = await sdk.platform.identities.get(curIdentityId);

    console.log(msg.reference)
    console.log(msg.status)
    console.log(msg.vid_pin)
    console.log(msg.temp_timestamp)

    var docProperties = {
      reference: msg.reference,
      status: msg.status,
      vid_pin: msg.vid_pin,
      temp_timestamp: msg.temp_timestamp
    }
    // Create the note document
    var noteDocument = await sdk.platform.documents.create(
      pContractName + "." + pResponseDocument[curDocNr],
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
    await sdk.platform.documents.broadcast(documentBatch, tidentity);
  } catch (e) {
    console.error('Something went wrong:', e);
  } finally {
    console.log("submitted wds document with message: " + msg)
  }
  return true;
}

async function submitSimpleDappTransaction(addr, amount) {
  var transaction = null;
  console.log(amount)
  var satAmount = amount * 100000000;
  console.log(satAmount)
  transaction = await account.createTransaction({
    recipient: addr,
    satoshis: satAmount,
  });
  console.dir(transaction)
  const result = await account.broadcastTransaction(transaction);
  console.log('Transaction broadcast!\nTransaction ID:', result);
  return true;
}

async function submitSimpleDappDocument(contractid, docName, docContent) {

  try {

    // psdkOpts = {};
    // psdkOpts.network = 'testnet';
    // psdkOpts.wallet = {};
    // psdkOpts.wallet.mnemonic = curMnemonic;
    // psdkApps = '{ "myContract" : { "contractId" : "' + contractid + '" } }';
    // psdkApps = JSON.parse(psdkApps);
    // psdkOpts.apps = psdkApps;

    // var docSdk = new Dash.Client(psdkOpts);
    sdk.getApps().set(submitContractName,  { "contractId" : contractid } )

    var tidentity = await sdk.platform.identities.get(curIdentityId);

    // build docProperty json from docContent string
    docContent = JSON.parse(docContent);  // convert java string to json object
    var docProperties = {};

    for (x in docContent) { // loop json object
      docProperties[x] = docContent[x]; // set docProperties[key] = value
    }
    console.log(docProperties)

    // Create the note document
    var noteDocument = await sdk.platform.documents.create(
      submitContractName + "." + docName,
      tidentity,
      docProperties
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
    await sdk.platform.documents.broadcast(documentBatch, tidentity);
    console.log("submitted " + docName + " document with content: " + docContent + " to contract " + contractid)
  } catch (e) {
    console.error('Something went wrong:', e);
  } finally {
    // docSdk.disconnect()
  }
  return true;
}

async function submitSimpleDappContractCreation(contractSchema) {

  try {

    // psdkOpts = {};
    // psdkOpts.network = 'testnet';
    // psdkOpts.wallet = {};
    // psdkOpts.wallet.mnemonic = curMnemonic;
    // psdkApps = '{ "myContract" : { "contractId" : "' + contractid + '" } }';
    // psdkApps = JSON.parse(psdkApps);
    // psdkOpts.apps = psdkApps;

    // var docSdk = new Dash.Client(psdkOpts);
    // sdk.getApps().set("myContract",  { "contractId" : contractid } )

    var tidentity = await sdk.platform.identities.get(curIdentityId);

    // prepare contract
    contractSchemaJson = JSON.parse(contractSchema);  // convert java string to json object

    const contract = await sdk.platform.contracts.create(contractSchemaJson, tidentity);
    console.dir({ contract }, { depth: 15 });
    // console.dir({ contract });
    console.log("Contract ID created: " + contract.id.toString());

    // Make sure contract passes validation checks
    const validationResult = await sdk.platform.dpp.dataContract.validate(contract);

    if (validationResult.isValid()) {
      console.log("validation passed, broadcasting contract..");
      // Sign and submit the data contract
      console.dir(await sdk.platform.contracts.broadcast(contract, tidentity));
    } else {
      console.error(validationResult) // An array of detailed validation errors
      throw validationResult.errors[0];
    }
    // console.log("success created contract with id " + contract.id.toString() + " and schema: " + contractSchema )
    console.log("success created contract with id " + contract.id.toString() )
    chrome.runtime.sendMessage({
      msg: "show contract",
      contractId: contract.id.toString()
    });

  } catch (e) {
    console.error('Something went wrong:', e);
  } finally {
    // docSdk.disconnect()
  }
  return true;

}

chrome.notifications.onClicked.addListener(async (id) => {
  console.log("Notification clicked")
  dappSigningDialog();
  chrome.notifications.clear(id);
});

async function polling() {

  // TODO: remove later
  getIdentityKeys();

  // get docID for current user
  await getDocID();
  pRequestTarget = curDocDomainID;

  // TODO remove when DashJS removed curApps
  psdkOpts = {};
  psdkOpts.network = 'testnet';
  psdkOpts.wallet = {};
  psdkOpts.wallet.mnemonic = curMnemonic;
  sdkOpts.wallet.unsafeOptions = {};
  sdkOpts.wallet.unsafeOptions.skipSynchronizationBeforeHeight = 415000; // only sync from start of 2021

  psdkApps = '{ "myContract" : { "contractId" : "' + pContractID + '" } }';
  psdkApps = JSON.parse(psdkApps);
  psdkOpts.apps = psdkApps;

  var nStart = [1, 1, 1];
  var pollLocator = ["myContract." + pRequestDocument[0], "myContract." + pRequestDocument[1], "myContract." + pRequestDocument[2]];

  pollSdk = new Dash.Client(psdkOpts);

  var reachedHead = [false, false, false];
  // for testing (remove later):
  // var reachedHead = true;
  // nStart = 38;

  while (curSwitch) {

    var i;
    for (i = 0; i < 3; i++) {
      curDocNr = i;
      try {

        console.log("polling " + pRequestDocument[i] + ": " + nStart[i]);

        var pollQuery = '{ "startAt" : "' + nStart[i] + '" }';
        // console.log(pollQuery)
        pollQuery = JSON.parse(pollQuery);
        const pollDoc = await pollSdk.platform.documents.get(pollLocator[i], pollQuery);

        if (pollDoc.length == 0 || reachedHead[i] == false) {
          if (pollDoc.length == 0) {
            reachedHead[i] = true;
            // console.log("reached head")
            await new Promise(r => setTimeout(r, 1800));  // sleep x ms
          }
          nStart[i] = nStart[i] + pollDoc.length;
          continue;
        }
        console.log("polldoc length: " + pollDoc.length)

        for (let index = 0; index < pollDoc.length; ++index) {
          var requestMsg = pollDoc[index].data;  // get document data , TODO: change to pRequestProp
          if (requestMsg.reference == null) return;

          if (requestMsg.reference.startsWith(pRequestTarget)) {  // check for Target docID
            console.log("Found message starting with " + pRequestTarget);
            curDappRequests = [];
            curDappRequests.push(requestMsg);
            // debug, remove
            console.log("requestMsg.reference:")
            console.log(requestMsg.reference)

            var views = chrome.extension.getViews({ type: "popup" });
            //views => [] //popup is closed
            //views => [DOMWindow] //popup is open
            console.log(views)

            // encryption stuff
            var vendorUserId = aliceDocDomainId //alice, vendor
            var userUserId = curDocDomainID;
            var loginPin = curPin;
            var userPrivateKey = curIdentityPrivKey.toString();
            // var userPrivateKey = curIdentityPrivKey;

            var senderPublicKey = alicePublicKey;
            var LoginReq = curDappRequests[0];


            // console.log("uid_pin: " + curDappRequests[0].uid_pin)
            // var vendor_hash_uidpin = DashmachineCrypto.encrypt(userPrivateKey, LoginReq.nonce, senderPublicKey);
            // console.log("encrypted object:");
            // console.log(vendor_hash_uidpin);

            // CW concats these three values to get the plain uid_pin value
            const plainUID_PIN = vendorUserId.concat(userUserId, loginPin.toString())
            console.log("plainUID_PIN:", plainUID_PIN);

            //CW get the hashed + encrypted uids + PIN
            const hashedAndEncryptedUID_PIN = LoginReq.uid_pin;
            console.log("uid_pin:", hashedAndEncryptedUID_PIN);

            //CW decrypts this value to get the hash digest of plainUID_PIN
            console.log(userPrivateKey)
            console.log(hashedAndEncryptedUID_PIN)
            console.log(senderPublicKey)
            // const decryptedUID_PIN = DashmachineCrypto.decrypt(userPrivateKey, hashedAndEncryptedUID_PIN, senderPublicKey).data;
            const decryptedUID_PIN = DashmachineCrypto.decrypt(userPrivateKey, hashedAndEncryptedUID_PIN, senderPublicKey).data;
            console.log("decryptedUID_PIN (The hash digest of plainUID_PIN):", decryptedUID_PIN);

            //CW verifies that decryptedUID_PIN ==the digest of the hashed plainUID_PIN (checkign the plain message against a hash of itself)
            const verified = DashmachineCrypto.verify(plainUID_PIN, decryptedUID_PIN);
            console.log("verified?:", verified);
            if (verified.success) { uidpin_verified = true; } else { uidpin_verified = false; }

            //CW decrypts the nonce
            const encryptedNonce = LoginReq.nonce;
            console.log("encryptedNonce", encryptedNonce);
            const decryptedNonce = DashmachineCrypto.decrypt(userPrivateKey, encryptedNonce, senderPublicKey).data;
            console.log("decrypted nonce:", decryptedNonce);

            //Generate Response Doc:
            //reference: Vendor userID (Reference)

            //vid_pin: Encrypted Hash of [Vendor nonce + Vendor userID + CW Pin)
            const plainVID_PIN = decryptedNonce.concat(vendorUserId, loginPin.toString());
            console.log('plainVID_PIN', plainVID_PIN);

            //hash then encrypt for the vendors PK
            const hashedVID_PIN = DashmachineCrypto.hash(plainVID_PIN).data;
            console.log('hashedVID_PIN', hashedVID_PIN);

            /********
            * THE ENCRYTION FUNCTION DOES NOT APPEAR TO BE STABLE (IN THIS EXAMPLE AT LEAST)
            * IT's RETURNING SAME RESULT FOR VID_PIN AND STATUS
            * POSSIBLY DUE TO USE OF STATIC FUNCTIONS IN CLASS, MORE LIKELY HOW AWAIT WORKS IN REPL ???
            */

            //CW gets the wallet user's own private key
            //CW looks up the vendors public key from their userid
            //encrypt hashedVID_PIN
            var encryptedVID_PIN = DashmachineCrypto.encrypt(userPrivateKey, hashedVID_PIN, senderPublicKey).data;
            console.log('encryptedVID_PIN', encryptedVID_PIN);

            //status: Encrypted [status+entropy] (0 = valid)
            const statusCode = 0;
            const status = statusCode.toString().concat(DashmachineCrypto.generateEntropy());
            console.log('status', status);
            const encryptedStatus = DashmachineCrypto.encrypt(userPrivateKey, status, senderPublicKey).data;
            console.log('encryptedStatus', encryptedStatus);

            //LoginResponse DocData
            if (i == 0) {
              loginResponseDocOpts[i] = { reference: vendorUserId, vid_pin: encryptedVID_PIN, status: encryptedStatus, temp_timestamp: LoginReq.temp_timestamp };
              console.log('loginResponseDocOpts');
              console.dir(loginResponseDocOpts[i]);
            } else if (i == 1) {
              loginResponseDocOpts[i] = { reference: vendorUserId, vid_pin: encryptedVID_PIN, status: encryptedStatus, temp_timestamp: LoginReq.temp_timestamp };
              console.log('signupResponseDocOpts');
              console.dir(loginResponseDocOpts[i]);
            } else if (i == 2) {
              loginResponseDocOpts[i] = { reference: vendorUserId, vid_pin: encryptedVID_PIN, status: encryptedStatus, temp_timestamp: LoginReq.temp_timestamp };
              console.log('tweetResponseDocOpts');
              console.dir(loginResponseDocOpts[i]);
            }

            // OS Request-DappSigning Notification
            console.log("Creating Notification")
            chrome.notifications.create("Dash-Notification", {
              type: "basic",
              iconUrl: chrome.extension.getURL("img/icon128.png"),
              title: "Request",
              message: "Received Dapp Message. Confirm Request?",
              // requireInteraction: true  // TODO: test if works with https, currently no difference
            });

            // sleep until notification is checked
            wls.setItem('notification', true)

            while (wls.getItem('notification') == 'true') {
              await new Promise(r => setTimeout(r, 5000));
            }
          }
        }
        nStart[i] = nStart[i] + pollDoc.length;
        // await pollSdk.disconnect();

      } catch (e) {
        // NOTE: firefox not supporting buttons in notification, also not supporting alert+confirm dialog in background
        console.log("caught error polling " + e)
        // curSwitch = false
        // return;
      }
    }
  }
  await pollSdk.disconnect();
  console.log("return")
  return;
}


async function polling2() {

  // TODO: remove later
  getIdentityKeys();

  // get docID for current user
  // await getDocID();
  // pRequestTarget = curDocDomainID;
  pRequestTarget = curName;

  // TODO remove when DashJS removed curApps
  // psdkOpts = {};
  // psdkOpts.network = 'testnet';
  // psdkOpts.wallet = {};
  // psdkOpts.wallet.mnemonic = curMnemonic;
  // psdkApps = '{ "myContract" : { "contractId" : "' + messageContractId + '" } }';
  // psdkApps = JSON.parse(psdkApps);
  // psdkOpts.apps = psdkApps;

  var nStart = [1];
  var pollLocator = [msgContractName + "." + pRequestDocument2[0]];

  // pollSdk = new Dash.Client(psdkOpts);
  sdk.getApps().set(msgContractName,  { "contractId" : messageContractId } )

  var reachedHead = [false];
  // for testing (remove later):
  // var reachedHead = true;
  // nStart = 38;

  while (curSwitch2) {

    var i;
    for (i = 0; i < 1; i++) {
      curDocNr = i;
      try {

        console.log("polling " + pRequestDocument2[i] + ": " + nStart[i]);
        // console.log("i is: " + i)
        // console.log("nStart / pRequestDocument2 is: " + nStart[i] + " / " + pRequestDocument2[i])

        var queryString = '{ "startAt" : "' + nStart[i] + '" }';
        queryJson = JSON.parse(queryString);
        // console.log(queryJson)

        const pollDoc = await sdk.platform.documents.get(pollLocator[i], queryJson);

        // console.dir(pollDoc)
        // console.log(pollDoc.length)

        if (pollDoc.length == 0 || reachedHead[i] == false) {
          // console.log("reachedHead is false")
          if (pollDoc.length == 0) {
            // console.log("reachedHead set: true")
            reachedHead[i] = true;
            // console.log("reached head")
            await new Promise(r => setTimeout(r, 5000));  // sleep x ms
          }
          nStart[i] = nStart[i] + pollDoc.length;
          continue;
        }
        console.log("polldoc length: " + pollDoc.length)

        for (let index = 0; index < pollDoc.length; ++index) {
          var requestMsg = pollDoc[index].data;  // get document data , TODO: change to pRequestProp
          if (requestMsg.reference == null) {
            console.log("reference is null");
            continue;
          }

          // if (requestMsg.reference.startsWith(pRequestTarget)) {  // check for Target docID
          if (requestMsg.reference == pRequestTarget) {  // check for username match

            console.log("Received message for " + pRequestTarget);
            curDappRequests = [];
            curDappRequests.push(requestMsg);
            // debug, remove
            console.log("requestMsg.reference: " + requestMsg.reference)

            var views = chrome.extension.getViews({ type: "popup" });
            //views => [] //popup is closed
            //views => [DOMWindow] //popup is open
            console.log(views)


            //message Response DocData
            if (i == 0) {
              // TODO only one object like orig dapp signing
              if (requestMsg.header != undefined) dsHeader = requestMsg.header;

              if (dsHeader == 'Request Document ST') {
                messageSubmitContractID[i] = requestMsg.STcontract;
                messageSubmitDocName[i] = requestMsg.STdocument;
                messageSubmitDocContent[i] = requestMsg.STcontent;
                console.log("Target Contract: " + requestMsg.STcontract);
                console.log("Target Document: " + requestMsg.STdocument);
                console.log("Target Contract: " + requestMsg.STcontent);
              } else if (dsHeader == 'Request Transaction TX') {
                messageAmountTx[i] = requestMsg.TXamount;
                messageAddrTx[i] = requestMsg.TXaddr;
                console.log("Address Tx: " + requestMsg.TXaddr);
                console.log("Amount Tx: " + requestMsg.TXamount);
              } else if (dsHeader == 'Request ContractCreation ST') {
                messageSubmitContractCreation[i] = requestMsg.STcontract;
                console.log("Contract Schema: " + requestMsg.STcontract);
              } else {
                console.log("Skipping - Header specified: " + dsHeader)
                continue;
                // pollSdk.disconnect();
                // return;
              }
            }

            // OS Request-DappSigning Notification
            console.log("Creating Notification")
            chrome.notifications.create("Dash-Notification", {
              type: "basic",
              iconUrl: chrome.extension.getURL("img/icon128.png"),
              title: "Request",
              message: "Received Dapp Message. Confirm Request?",
              // requireInteraction: true
            });

            wls.setItem('notification', true)

            chrome.runtime.sendMessage({
              msg: "open dappDialog"
            });

            // TODO: need to catch case where window is closed and confirm or deny is not submitted, for now do nothing
            // also check https://stackoverflow.com/questions/15561723/final-window-close-event-listener-in-chrome-browser
            // sleep until notification is checked
            while (wls.getItem('notification') == 'true') {
              await new Promise(r => setTimeout(r, 5000));
            }
          }
        }
        nStart[i] = nStart[i] + pollDoc.length;
        // await pollSdk.disconnect();

      } catch (e) {
        // NOTE: firefox not supporting buttons in notification, also not supporting alert+confirm dialog in background
        console.log("caught error polling " + e)
        console.dir(e)
        await new Promise(r => setTimeout(r, 5000));
        // curSwitch = false
        // return;
      }
    }
  }
  // pollSdk.disconnect();
  console.log("return")
  return;
}

async function setDappResponse(decision) {
  console.log(decision);
  if (decision == "confirm" && curSwitch == true) {
    // var responseMsgSigned = await signMsg(curDappRequests[0].reference);
    // console.log("currDappRequest reference: " + curDappRequests[0].reference)
    // console.log("responseMsgSigned: " + responseMsgSigned)
    // await submitDocument(responseMsgSigned);
    await submitWdsResponseDocument(loginResponseDocOpts[curDocNr]);
  } else if (decision == "confirm" && curSwitch2 == true) {
    if (dsHeader == 'Request Document ST')
      await submitSimpleDappDocument(messageSubmitContractID[0], messageSubmitDocName[0], messageSubmitDocContent[0]);
    else if (dsHeader == 'Request ContractCreation ST')
      await submitSimpleDappContractCreation(messageSubmitContractCreation[0])
    else if (dsHeader == 'Request Transaction TX')
      await submitSimpleDappTransaction(messageAddrTx[0], messageAmountTx[0]);
  }
  wls.setItem('notification', false)
  chrome.notifications.clear("Dash-Notification");
  dappDialogActive = false;
};

function getDappRequests() {
  console.log("curdapprequest: " + curDappRequests[0])
  return curDappRequests;
}

async function dappSigningDialog() {
  console.log("dappSigningDialog called")
  if (!dappDialogActive) {
    chrome.windows.create({
      url: chrome.extension.getURL('dialog.html'),
      type: 'popup',
      // state: 'normal',
      // focused: true, // not supported by firefox, will throw error and break program (update: might be supported now)
      top: 300,
      left: 300,
      width: 710,
      height: 340
    });
    console.log("dapp signing dialog created")
    dappDialogActive = true;
  }
  
  // return true;
}

async function getDocID() {
  // psdkOpts = {};
  // psdkOpts.network = 'testnet';
  // psdkOpts.wallet = {};
  // psdkOpts.wallet.mnemonic = curMnemonic;
  // psdkApps = '{ "myContract" : { "contractId" : "' + domainContractID + '" } }';
  // psdkApps = JSON.parse(psdkApps);
  // psdkOpts.apps = psdkApps;

  var tRecordLocator = "dpns.domain";
  var tQueryObject = '{ "where": [' +
    '["normalizedParentDomainName", "==", "dash"],' +
    '["normalizedLabel", "==", "' + curName + '"]' +
    '],' +
    '"startAt": 1 }';

  try {
    // var docSdk = new Dash.Client(psdkOpts);

    var queryJson = JSON.parse(tQueryObject);
    if (curName == '') {
      curSwitch = false;
      // await chrome.storage.local.set({ switch: false });
      wls.setItem('switch', false)
      throw "Name not set, please create a Username for your Identity";
    }
    const documents = await sdk.platform.documents.get(tRecordLocator, queryJson);
    // await new Promise(r => setTimeout(r, 2000));  // sleep x ms
    // TODO: remove later, just a fix for current dashjs error 13
    console.log(documents)
    if (documents[0] == null || documents[0] == undefined) {
      console.log("Couldnt connect to network, aborting polling! Please try again in a few moments.");
      curSwitch = false;
      // await chrome.storage.local.set({ switch: false });
      wls.setItem('switch', false)
    } else {
      console.log("Document ID for user " + curName + ": " + documents[0].id)
      curDocDomainID = documents[0].id.toString()
      console.log("saved document domain ID")
    }
  } catch (e) {
    console.error('Something went wrong:', e);
  } finally {
    docSdk.disconnect()
  }
}

async function changePinLoop() {
  while (curSwitch) {
    await new Promise(r => setTimeout(r, 600000));  // 10 min
    curPin = Math.floor(Math.random() * 900000) + 100000;
    // chrome.storage.local.set({ pin: curPin });
    wls.setItem('pin', curPin)
  }
}

////////////// END experimental code for dapp signing ////////////

// if (curMnemonic != "" && curMnemonic != null) {
(async function start() {
  await connect();
})();


// }

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

  // try not working for account object at this position

  // if (request.greeting == 'importMnemonic') {
  //   curMnemonic = request.mnemonic;
  //   console.log(curMnemonic);
  //   disconnect();
  //   connect();
  // }
  
  // if (request.greeting == 'getDocuments') {
    // curApps = '{ "myContract" : { "contractId" : "' + request.contractId + '" } }';
    // curApps = JSON.parse(curApps);
    // disconnect();
    // connect();
  // }

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

  // connect().then(() => {

  switch (String(request.greeting)) {

    case "connect":
      (async function connectTest() {
        console.log('connect with ' + curMnemonic);
        if (wls.getItem('connected') == 'true')
          sendResponse({ complete: true })
        else 
          sendResponse({ complete: false })
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
        // await chrome.storage.local.set({ switch: curSwitch });
        wls.setItem('switch', curSwitch)
        if (curSwitch) {
          polling();
          // changePinLoop();
        }
        sendResponse({ complete: true });
        // disconnect();
      })();
      break

    case "switch2":
      (async function dappSigning() {
        curSwitch2 = request.switch;
        console.log("curSwitch2: " + curSwitch2)
        // await chrome.storage.local.set({ switch2: curSwitch2 });
        wls.setItem('switch2', curSwitch2)
        if (curSwitch2) {
          polling2();
        }
        sendResponse({ complete: true });
        // disconnect();
      })();
      break

    case "createWallet":
      (async function createWallet() {
        console.log('createWallet');

        // const account = await sdk.wallet.getAccount();
        // await account.isReady();
        try {
          const mnemonic = await sdk.wallet.exportWallet();
          curMnemonic = mnemonic;
          const address = await account.getUnusedAddress(); // account null error, dont get catched TODO
          curAddress = address.address;
        } catch (e) {
          sendResponse({ complete: false });
          return;
        }
        // await chrome.storage.local.set({ mnemonic: curMnemonic });
        wls.setItem('mnemonic', curMnemonic)
        // var savedMM = await getLocalStorage(['mnemonic']);
        // await chrome.storage.local.set({ address: curAddress });
        wls.setItem('address', curAddress)
        // var savedAddress = await getLocalStorage(['address']);
        // await chrome.storage.local.set({ balance: '0' });
        wls.setItem('balance', '0')
        // var savedBalance = await getLocalStorage(['balance']);

        /////// run automated faucet
        console.log("run automated faucet for address " + curAddress)
        var httpReq = new XMLHttpRequest();
        var httpReq2 = new XMLHttpRequest();  // TODO remove redundant obj

        // -1 is dm faucet 
        httpReq.open("GET", "http://autofaucet-1.dashevo.io:5050/drip/" + curAddress, true); // true for async
        httpReq.addEventListener("load", function (e) {
          console.log(httpReq.responseText);
        }, false)
        httpReq.send(null);

        // -2 is cloud for redundancy (also got /bigdrip with 3 dash)
        httpReq2.open("GET", "http://autofaucet-2.dashevo.io:5050/drip/" + curAddress, true); // true for async
        httpReq2.addEventListener("load", function (e) {
          console.log(httpReq2.responseText);
        }, false)
        httpReq2.send(null);

        /////////////////////////////

        sendResponse({ complete: true });
        // disconnect();
      })();
      break;


    case "importMnemonic":

      (async function importMnemonic() {
        console.log('importMnemonic');

        curMnemonic = request.mnemonic;
        console.log(curMnemonic);

        await disconnect();
        await connect();

        // await chrome.storage.local.set({ mnemonic: curMnemonic });
        wls.setItem('mnemonic', curMnemonic)

        try {
          curAddress = (await account.getUnusedAddress()).address;
          console.log(curAddress)
          // await chrome.storage.local.set({ address: curAddress });
          wls.setItem('address', curAddress)
          
          curBalance = ((await account.getTotalBalance()) / 100000000);
          console.log(curBalance)
          // await chrome.storage.local.set({ balance: curBalance });
          wls.setItem('balance', curBalance)

          // console.dir(await account.identities.getIdentityIds());
          curIdentityId = (await account.identities.getIdentityIds()[0]).toString();
          console.log(curIdentityId)
          // await chrome.storage.local.set({ identityId: curIdentityId });
          // await chrome.storage.local.set({ identityId: "" });
          wls.setItem('identityId', curIdentityId)

          await getIdentityKeys();
          
          curName = await getDefaultUsername();
          console.log(curName)
          wls.setItem('name', curName)

          console.log("Finish importing Mnemonic in background");
        } catch (e) {
          console.error('Something went wrong:', e);
          sendResponse({ complete: false });
          return;
        }

        sendResponse({ complete: true });
        // disconnect();
      })()
      break;


    case "getBalance":
      // TODO: use events api to auto update balance
      (async function getBalance() {

        // const account = await sdk.wallet.getAccount();
        // await account.isReady();

        // if (request.wait != '') {
        //   await new Promise(r => setTimeout(r, 20000));  // sleep x ms
        // }
        console.log('getBalance');
        // console.log(await account.getUnconfirmedBalance())
        // console.log(await account.getTotalBalance())
        // console.log(await account.getConfirmedBalance())
        // console.log(e2)

        // await chrome.storage.local.set({ balance: ((await account.getTotalBalance()) / 100000000) });
        try {
          curBalance = ((await account.getTotalBalance()) / 100000000);
        } catch (e) {
          sendResponse({ complete: false });
          return;
        }
        wls.setItem('balance', curBalance);
        sendResponse({ complete: true });
        // disconnect();
      })()
      break;


    case "sendFunds":
      (async function sendFunds() {
        console.log('sendFunds');

        // const account = await sdk.wallet.getAccount();
        // await account.isReady();
        try {
          var transaction = null;
          if (request.toAddress == '' && request.amount == '') {
            transaction = await account.createTransaction({
              recipient: 'yP8A3cbdxRtLRduy5mXDsBnJtMzHWs6ZXr', // dash faucet
              satoshis: 100000000, // 1 Dash
            });
          }
          else if (request.toAddress != '' && request.amount != '') {
            var satAmount = request.amount * 100000000;
            transaction = await account.createTransaction({
              recipient: request.toAddress,
              satoshis: satAmount,
            });
          }
          console.dir(transaction)
          const result = await account.broadcastTransaction(transaction);
          console.log('Transaction broadcast!\nTransaction ID:', result);
        } catch (e) {
          sendResponse({ complete: false });
          return;
        }

        // TODO: this should be working, bug in DashJS i guess, using popup.js for now
        // await new Promise(r => setTimeout(r, 20000));  // sleep x ms
        // console.log(await sdk.account.getUnconfirmedBalance())
        // console.log(await sdk.account.getTotalBalance())
        // await chrome.storage.local.set({ balance: ((await sdk.account.getUnconfirmedBalance()) / 100000000) });
        sendResponse({ complete: true });
        // disconnect();
      })()
      break;


    case "registerIdentity":
      (async function registerIdentity() {
        console.log('registerIdentity');
        // import identityID if given '<string>' from popup.js
        try {
          if (request.identityId != '') {
            console.log("importing identity")
            tmpIdentity.id = request.identityId;
          }
          // create identity if given '' from popup.js
          else if (request.identityId == '') {
            console.log("creating identity")
            tmpIdentity = await sdk.platform.identities.register();
          }
          console.log({ tmpidentity: tmpIdentity.id });
          curIdentityId = tmpIdentity.id;
          // await chrome.storage.local.set({ identityId: tmpIdentity.id });
          wls.setItem('identityId', tmpIdentity.id)
          getIdentityKeys();
        } catch (e) {
          sendResponse({ complete: false });
          console.dir(e)
          return;
        }

        sendResponse({ complete: true });
        // disconnect();
      })()
      break;


    case "registerName":
      (async function registerName() {
        console.log('registerName');
        curName = request.name;
        // TODO: bug when having several identitys, importing 1st and then registering name
        try {
          tmpIdentity = await sdk.platform.identities.get(curIdentityId);
          console.log(tmpIdentity)
          // const nameRegistration = await sdk.platform.names.register(curName + ".dash", tmpIdentity);
          const nameRegistration = await sdk.platform.names.register(curName + ".dash",  { dashUniqueIdentityId: tmpIdentity.getId() }, tmpIdentity);
          console.log({ nameRegistration });
          // await chrome.storage.local.set({ name: curName });
          wls.setItem('name', curName)
        } catch (e) {
          sendResponse({ complete: false });
          return;
        }

        sendResponse({ complete: true });
        // disconnect();
      })()
      break;


    case "getDocuments":
      (async function getDocuments() {
        console.log('getDocuments');

        // { "myContract" : { "contractId" : "' + request.contractId + '" } }
        sdk.getApps().set(queryContractName,  { "contractId" : request.contractId } )

        const recordLocator = queryContractName + "." + request.documentName; // just use myContract for all

        try {
          var queryString = request.queryObject;
          var queryJson = JSON.parse(queryString);
          
          // var queryStringify = JSON.stringify(queryJson, null, 2);

          // console.log(request.queryObject);
          // console.log(queryJson);

          // Note
          // client.apps is an instance of ClientApps class. Use Client#getApps() to get/update applications
          // console.log('jembe.contractId', client.getApps().get('jembe').contractId)
          // console.log('jembe.contractId', client.getApps().apps.jembe.contractId)
          // sdk.getApps().get('myContract').contractId = '3VvS19qomuGSbEYWbTsRzeuRgawU3yK4fPMzLrbV62u8';

          const documents = await sdk.platform.documents.get(recordLocator, queryJson );
          console.log(documents);
          var documentJson = JSON.stringify(documents, null, 2)
        } catch (e) {
          console.log(e);
          sendResponse({ complete: false });
          return;
        }

        // todo: fix encoding warning in firefox
        let a = URL.createObjectURL(new Blob([documentJson]), { encoding: "UTF-8", type: "text/plain;charset=UTF-8" })

        chrome.windows.create({
          type: 'popup',
          url: a
        });

        sendResponse({ complete: true });
        // disconnect();
      })()
      break;


    case "getContract":
      (async function getContract() {
        console.log('getContract');
        try {
          const contract = await sdk.platform.contracts.get(request.contractId);
          // const contract = await sdk.platform.contracts.get('77w8Xqn25HwJhjodrHW133aXhjuTsTv9ozQaYpSHACE3');
          console.dir({ contract }, { depth: 5 });
          var contractJson = JSON.stringify(contract, null, 2)
        } catch (e) {
          sendResponse({ complete: false });
          return;
        }
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
        // disconnect();
      })()
      break;


    case "resetWallet":
      (async function resetWallet() {
        console.log("RESET")
        curMnemonic = null; // must be null for dashjs init
        curAddress = '';
        curBalance = '';
        curIdentityId = '';
        curName = '';
        curSwitch = false;
        curSwitch2 = false;
        // chrome.storage.local.set({ mnemonic: '' }); // must be '' for popup.js
        // chrome.storage.local.set({ address: '' });
        // chrome.storage.local.set({ balance: '' });
        // chrome.storage.local.set({ identityId: '' });
        // chrome.storage.local.set({ name: '' });
        // chrome.storage.local.set({ switch: '' });
        wls.setItem('mnemonic', '')
        wls.setItem('address', '')
        wls.setItem('balance', '')
        wls.setItem('identityId', '')
        wls.setItem('name', '')
        wls.setItem('switch', false)
        wls.setItem('switch2', false)
        wls.setItem('notification', false)
        
        // TODO: might need LocalForageWrapper adaption here
        console.log("localforage length before reset: " + await localforage.length())
        await localforage.clear();
        console.log("localforage length after reset: " + await localforage.length())

        sendResponse({ complete: true });
        disconnect();
        connect();
      })()
      break;


    default:
      // error
      console.log('ERROR Unknown Message: ' + String(request.greeting));
      // disconnect();
      break;
  }

  // return true from the event listener to indicate you wish to send a response asynchronously
  // (this will keep the message channel open to the other end until sendResponse is called).
  return true;

});