import React, { Component } from 'react';
import Websocket from 'react-websocket';
import CompareView from './compareView';
const pako = require('pako');

function precise(x, p=5) {
  return Number.parseFloat(x).toPrecision(p);
}

class App extends Component {
  constructor(props) {
    super(props);
    var prices = {};
    var future_contracts = [{
      contract_code: "ETH_CW", 
      symbol: "ETH"
    }, {
      contract_code: "ETH_NW", 
      symbol: "ETH"
    }, {
      contract_code: "ETH_CQ", 
      symbol: "ETH"
    }, {
      contract_code: "ETH_NQ", 
      symbol: "ETH"
    }, {
      contract_code: "BTC_CW", 
      symbol: "BTC"
    }, {
      contract_code: "BTC_NW", 
      symbol: "BTC"
    }, {
      contract_code: "BTC_CQ", 
      symbol: "BTC"
    }, {
      contract_code: "BTC_NQ", 
      symbol: "BTC"
    }];
    var symbols = ['ETH', 'BTC'];
    for(let symbol of symbols){
      prices[symbol] = null;
    }

    var contractSuffixes = ['-USD', '_CW', '_NW', '_CQ', '_NQ'];
    var contracts = [];
    var symbolContracts = {};
    for (let symbol of symbols){
      var currentSymbolContracts = [];
      for (let suffix of contractSuffixes){
        var contract = {
          contractCode: symbol + suffix, 
        };
        contracts.push(contract);
        currentSymbolContracts.push(contract);
      }
      symbolContracts[symbol] = currentSymbolContracts;
    }


    var historyData = {};
    var currentPair = null;
    var openPrices = {};
    this.state = {
      count: 90, 
      prices, 
      symbols, 
      future_contracts, 
      historyData, 
      currentPair,
      contracts, 
      symbolContracts, 
      openPrices, 
    };

    this.sendMessage = this.sendMessage.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.updatePrice = this.updatePrice.bind(this);
    this.sendMessageSwap = this.sendMessageSwap.bind(this);
    this.queryFutureKlineData = this.queryFutureKlineData.bind(this);
    this.onClickMarketData = this.onClickMarketData.bind(this);
    this.compareContracts = this.compareContracts.bind(this);
    this.updateOpenPrice = this.updateOpenPrice.bind(this);
  }

  queryFutureKlineData(symbol, peroid, from, to){
    var postData = JSON.stringify({
        "req": `market.${symbol}.kline.${peroid}`,
        "id": "id4",
        "from": from,
        "to": to, 
    })

    this.sendMessage(postData)
  }

  onClickMarketData(){
    console.log('onClickMarketData');
    this.queryFutureKlineData('ETH_CQ', '1min', 0, 1);
  }

  componentDidMount() {
    for(let symbol of this.state.symbols){

    }
  }

  handleData(data) {
    var sendMessage = this.sendMessage;
    var _this = this;
    data.arrayBuffer().then(function(compressedData){
      let text = pako.inflate(compressedData, {
        to: 'string'
      });
      let msg = JSON.parse(text);
      if (msg.ping) {
        sendMessage(JSON.stringify({
          pong: msg.ping
        }));
      } else if (msg.tick) {
        var m = msg.ch.match(/market\.([\w_]+)\.kline\.(.*)/);
        if(m){
        var symbol = m[1];
          // console.log(symbol);
          _this.updatePrice(symbol, msg.tick.close);
          if(m[2] == '1day'){
            _this.updateOpenPrice(symbol, msg.tick.open);
          }
        }
          // console.log(msg);
          // handle(msg);
      } 
      else if (msg.rep){
        var historyData = this.state.historyData;
        historyData[msg.rep] = msg.data;
        _this.setState({'historyData': historyData});
        _this.compareView.updateData(msg);
        //console.log(msg);
      }
      else {
          //console.log(text);
      }
    });
  }

  updatePrice(symbol, price){
    var prices = this.state.prices;
    prices[symbol] = price;
    this.setState({prices});
  }

  subscribe(){
    for (let symbol of this.state.symbols) {
      for (let period of ['CW', 'NW', 'CQ', 'NQ']){
        this.sendMessage(JSON.stringify({
            "sub": `market.${symbol}_${period}.kline.1day`,
            "id": `${symbol}_${period}`
        }));
      }
    }
  }

  handleOpen(){
    this.subscribe();
  }

  sendMessage(message){
    this.refWebSocket.sendMessage(message);
  }

  handleSwapOpen(){
    var symbols = new Set();
    for(let contract of this.state.future_contracts){
      symbols.add(contract.symbol);
    }

    for(let symbol of symbols){
      var swap_contract_code = `${symbol}-USD`;
      var sub = `market.${swap_contract_code}.kline.1day`;
      this.sendMessageSwap(JSON.stringify({
        sub: sub
      }));
    }
  }

  sendMessageSwap(message){
    this.ws_swap.sendMessage(message);
  }

  updateOpenPrice(symbol, price){
    var openPrices = this.state.openPrices;
    openPrices[symbol] = price;
    this.setState({openPrices});
  }

  handleSwapReceive(data){
    var _this = this;
    data.arrayBuffer().then(function(compressedData){
      let text = pako.inflate(compressedData, {
        to: 'string'
      });
      let msg = JSON.parse(text);
      if (msg.ping) {
        _this.sendMessageSwap(JSON.stringify({
          pong: msg.ping
        }));
      } else if (msg.tick) {
        var m = msg.ch.match(/market\.(([\w]+)\-([\w+]+))\.kline\.(.*)/);
        if(m){
          var symbol = m[2];
          var contractCode = m[1];
          //console.log(symbol);
          if(m[4] == '1day'){
            _this.updateOpenPrice(contractCode, msg.tick.open);
          }
          _this.updatePrice(symbol, msg.tick.close);
          _this.updatePrice(contractCode, msg.tick.close);
        }
          //console.log(msg);
          // handle(msg);
      else if (msg.req){
        _this.compareView.updateData(msg);
      }
      } else {
          //console.log(text);
      }
    });
  }

  compareContracts(newContract, farContract){
    console.log(newContract + ' vs ' + farContract);
    // this.compareView.setNearContract(newContract);
    // this.compareView.setFarContract(farContract);
    this.compareView.setContracts(newContract, farContract);
    var now = Date.now();
    var dailyStartTime = Math.floor(now / 1000 - 3600 * 14);
    var daylyEndTime = Math.floor(now / 1000);
    this.queryFutureKlineData(newContract.contractCode, '1day', dailyStartTime, daylyEndTime);
  }
  
  render() {
    var symbols = this.state.symbols;
    var future_contracts = this.state.future_contracts;
    var symbolContracts = this.state.symbolContracts;
    const refWebSocket = <Websocket url='wss://api.btcgateway.pro/ws'
      onMessage={this.handleData.bind(this)} debug={true}
      onOpen={this.handleOpen.bind(this)} 
      ref={Websocket => {
        this.refWebSocket = Websocket;
      }}/>
    return (
      <div>
        {Object.keys(symbolContracts).map((key, index) => {
          return <table symbol={key}>
            <thead>
              <tr>
                <td></td>
                <td></td>
                {symbolContracts[key].map((value, index) => {
                  return <td key={value.contractCode}>{value.contractCode}</td>
                })}
              </tr>
            </thead>
            <tbody>
              {symbolContracts[key].map((value, index) => {
                return <tr key={value.contract}>
                  <td>{value.contractCode}</td>
                  <td>
                    {precise(this.state.prices[value.contractCode])}
                    ({precise((this.state.prices[value.contractCode]/this.state.openPrices[value.contractCode]-1)*100, 3)}%)</td>
                  {symbolContracts[key].map((compareContract, index) => {
                    return <td onClick={() => this.compareContracts(value, compareContract)}>
                      {(this.state.prices[value.contractCode] - this.state.prices[compareContract.contractCode]).toFixed(4)}
                      ({(this.state.prices[value.contractCode] / this.state.prices[compareContract.contractCode]).toFixed(4)})
                      
                    </td>
                  })}
                </tr>
              })}
            </tbody>
          </table>
        })}
        {refWebSocket}
        <Websocket url='wss://api.btcgateway.pro/swap-ws'
            onMessage={this.handleSwapReceive.bind(this)} debug={true}
            onOpen={this.handleSwapOpen.bind(this)} 
            ref={Websocket => {
              this.ws_swap = Websocket;
            }}/>
        <CompareView ref={compareView => this.compareView=compareView} 
          futureWsClient={refWebSocket} 
          swapWsClient={this.ws_swap} />
      </div>
    );
  }
}

export default App;