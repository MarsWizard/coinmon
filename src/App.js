import React, { Component } from 'react';
import Websocket from 'react-websocket';
const pako = require('pako');

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
    this.state = {
      count: 90, 
      prices, 
      symbols, 
      future_contracts, 
    };

    this.sendMessage = this.sendMessage.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.updatePrice = this.updatePrice.bind(this);
    this.sendMessageSwap = this.sendMessageSwap.bind(this);
  }

  componentDidMount() {
    for(let symbol of this.state.symbols){
      var url = new URL('https://api.hbdm.com/api/v1/contract_contract_info');
      url.search = new URLSearchParams({'symbol': symbol});
      fetch(url)
      .then(res => res.json())
      .then((data) => {
        this.setState({ contacts: data })
      })
      .catch(console.log)
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
        var m = msg.ch.match(/market\.([\w_]+)\.kline\.1min/);
        if(m){
        var symbol = m[1];
          // console.log(symbol);
          _this.updatePrice(symbol, msg.tick.close);
        }
          // console.log(msg);
          // handle(msg);
      } else {
          // console.log(text);
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
            "sub": `market.${symbol}_${period}.kline.1min`,
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
      var sub = `market.${swap_contract_code}.kline.1min`;
      this.sendMessageSwap(JSON.stringify({
        sub: sub
      }));
    }
  }

  sendMessageSwap(message){
    this.ws_swap.sendMessage(message);
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
        var m = msg.ch.match(/market\.([\w]+)\-([\w+]+)\.kline\.1min/);
        if(m){
          var symbol = m[1];
          console.log(symbol);
          _this.updatePrice(symbol, msg.tick.close);
        }
          console.log(msg);
          // handle(msg);
      } else {
          console.log(text);
      }
    });
  }
  
  render() {
    var symbols = this.state.symbols;
    var future_contracts = this.state.future_contracts;
    return (
      <div>
        <table>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>LastPrice</th>
              <th>Spot</th>
              <th>Spread Rate</th>
            </tr>
          </thead>
          <tbody>
            {future_contracts.map((value, index) => {
              return <tr key={value.contract_code}>
                <td>{value.contract_code}</td>
                <td>{this.state.prices[value.contract_code]}</td>
                <td>{this.state.prices[value.symbol]}</td>
                <td>{(this.state.prices[value.contract_code] / this.state.prices[value.symbol]).toFixed(4)}</td>
              </tr>
            })}
          </tbody>
        </table>
        <Websocket url='wss://api.btcgateway.pro/ws'
            onMessage={this.handleData.bind(this)} debug={true}
            onOpen={this.handleOpen.bind(this)} 
            ref={Websocket => {
              this.refWebSocket = Websocket;
            }}/>
        <Websocket url='wss://api.btcgateway.pro/swap-ws'
            onMessage={this.handleSwapReceive.bind(this)} debug={true}
            onOpen={this.handleSwapOpen.bind(this)} 
            ref={Websocket => {
              this.ws_swap = Websocket;
            }}/>
        
      </div>
    );
  }
}

export default App;