import regeneratorRuntime from "regenerator-runtime";
import { h, app } from "hyperapp";
import { Link, Route, location, Switch } from "@hyperapp/router";
import axios from 'axios';
const { utils, Wallet } = require('ethers');
const { sendTransaction, balanceOf, call, Eth, onReceipt } = require('ethjs-extras');
const wrapper = require('solc/wrapper');
const solc = wrapper(window.Module);
const yulp = require('../src/index');

// local packages..
const styled = require('./lib/styled-elements').default;

// define initial app state
const state = {
  location: location.state,
  error: null,
  bytecode: '',
  autoCompile: true,
  contracts: {
    'input.yul': {}
  },
  errors: [],
};

var editor;

// localmemory storage
let localMemory = {};

// localstorage
const local = window.localStorage || {
  setItem: (key, value) => Object.assign(localMemory, { [key]: value }),
  getItem: key => localMemory[key] || null,
};

// define initial actions
const actions = {
  location: location.actions,
  load: () => (state, actions) => {
    editor = ace.edit("editor");
    editor.session.setMode("ace/mode/javascript");
    editor.getSession().setUseWorker(false);

    editor.renderer.on('afterRender', actions.autoCompile);
  },
  autoCompile: () => (state, actions) => {
    if (state.autoCompile) actions.compile();
  },
  compile: () => (state, actions) => {

    let yulpResult = null;
    let yulpError = [];

    try {
      yulpResult = yulp.print(yulp.compile(editor.getValue()).results);
    } catch (yulpErrors) {
      yulpError = [yulpErrors];
    }

    var output = JSON.parse(solc.compile(JSON.stringify({
      "language": "Yul",
      "sources": { "input.yul": { "content": yulpResult } }, // editor.getValue()
      "settings": {
        "outputSelection": { "*": { "*": ["*"], "": [ "*" ] } },
        "optimizer": { "enabled": true, "details": { "yul": true } }
      }
    })));

    local.setItem('code', editor.getValue());

    actions.change({
      contracts: output.contracts,
      errors: yulpError || output.errors,
    });
  },
  dark: () => (state, actions) => {
    var darky = !state.dark;
    actions.change({ dark: darky });

    if (darky) {
      document.body.style.background = 'rgb(39, 40, 34)';
      editor.setTheme("ace/theme/monokai");
    } else {
      document.body.style.background = '#FFF';
      editor.setTheme("ace/theme/textmate");
    }
  },
  change: obj => obj,
};

// no operation
const noop = () => {};

// provider
let provider = window.ethereum || (window.web3 || {}).currentProvider;

// provider..
const eth = Eth({ provider });

// server url
const serverURL = 'https://api.nickpay.com';

// json params for axios
const post = (url, data) => axios.post(serverURL + url, JSON.stringify(data));

// null token address
const nullAddress = '0x0000000000000000000000000000000000000000';

// dai token address
const daiTokenAddress = '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359';

// nickpay contract
const nickpayAddress = '0xdacce757c5fc1df946ead943353cf9e3b69054e3';

// who will get the fee
const feeRecipient = '0x0000000000000000000000000000000000000000';

// shorthand
const keccak256 = utils.keccak256;
const encodePacked = utils.solidityPack;
const abiEncode = encodePacked;

// lower case it
const lower = v => String(v).toLowerCase();

// are you sure message for unload.
window.onbeforeunload = function(e) {
  return 'Are you sure you want to close this tab. Data could be lost!';
};

// Not found page
const NotFound = () => (
  <div style={{ padding: '20%', 'padding-top': '100px' }}>
    <h1>Yulit</h1>
    <h3>Hmm... Page not found</h3>
  </div>
);

const Code = () => (state, actions) => (
  <div style={`display: flex; flex-direction: row; ${state.dark ? 'color: rgb(248, 248, 242);' : 'color: #000;'}`}>
    <div style="display: flex; flex-direction: row; width: 70%">
      <div id="editor" oncreate={actions.load} style="width: 100%; height: 100%; font-size: 18px;">{local.getItem('code') || `
object "SimpleStore" {
  code {
    // constructor code

    datacopy(0, dataoffset("Runtime"), datasize("Runtime"))  // runtime code
    return(0, datasize("Runtime"))
  }
  object "Runtime" {
    code {
      calldatacopy(0, 0, 36) // copy calldata to memory

      switch and(shr(224, mload(0)), 0xffffffff) // 4 byte method signature

      case 0x6057361d { // store(uint256 val)
        sstore(0, mload(4))
      }

      case 0x6d4ce63c { // get() returns (uint256)
        mstore(100, sload(0))
        return (100, 32)
      }
    }
  }
}
`}</div>
    </div>
    <div style={`width: 27%; height: 100%; margin-left: 3%; font-family: Monaco, Menlo, Consolas, source-code-pro, monospace; display: flex; flex-direction: column; word-wrap: break-word;`}>
      <button style="padding: 20px; margin-bottom: 20px;" onclick={actions.compile}>Compile</button>

      <div style="display: flex; flex-direction: row;">
        <div>
          <input type="checkbox" checked={(state.autoCompile ? "checked" : "")} onchange={() => actions.change({ autoCompile: !state.autoCompile })} /> Auto Compile
        </div>
        <div style="margin-left: 20px;">
          <input type="checkbox" checked={(state.dark ? "checked" : "")} onchange={() => actions.dark()} /> Dark
        </div>
        <div style="margin-left: 20px;">
          <button onclick={() => actions.reset()}>Reset</button>
        </div>
      </div>

      <h3>Errors</h3>
      {state.errors.map(v => v.formattedMessage || v.message)}

      <br /><br />

      {state.contracts ? Object.keys(state.contracts['input.yul']).map(contractName => (<div style="display: flex; flex-direction: column;">
        <h3>{contractName} (<small>{Math.round(state.contracts['input.yul'][contractName].evm.bytecode.object.length / 2)} bytes</small>)</h3>
        0x{state.contracts['input.yul'][contractName].evm.bytecode.object}

        <textarea style="height: 80px; margin-top: 20px; border: 0px;">{state.contracts['input.yul'][contractName].evm.bytecode.opcodes}</textarea>
      </div>)) : ''}

      <div style="flex: 1; display: flex; flex-direction: row; align-items: flex-end; font-weight: bold; font-size: 18px;">

        <a href="https://solidity.readthedocs.io/en/v0.5.7/yul.html" target="_blank" style="text-decoration: none; margin-top: 40px;">
          Yul Documentation
        </a>

      </div>
    </div>
  </div>
);

// routes for app
const Routes = () => (
  <Switch>
    <Route path="/" render={Code} />
    <Route render={NotFound} />
  </Switch>
);

// main app
const main = app(
  state,
  actions,
  Routes,
  document.body,
);

// unsubscripe for routing
const unsubscribe = location.subscribe(main.location);

// change global style..
styled.injectGlobal`
  body {
    padding: 0px;
    margin: 0px;
  }

  input, button {
    font-family: Monaco, Menlo, Consolas, source-code-pro, monospace;
  }
`;
