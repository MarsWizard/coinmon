import React, { Component } from 'react';

function showContractCode(contract){
    if(contract == null){
        return "";
    }

    return contract.contractCode;
}


class CompareView extends Component{
    constructor(props) {
        super(props);
        this.state = {
            nearContract: null,
            farContract: null,
        }

        this.futureWsClient = props.futureWsClient;
        this.swapWsClient = props.swapWsClient;
        console.log(props);

        this.setNearContract = this.setNearContract.bind(this);
        this.setFarContract = this.setFarContract.bind(this);
        this.setContracts = this.setContracts.bind(this);
    }

    setNearContract(contract){
        console.log(contract);
        this.setState({
            nearContract: contract
        })
    }

    setFarContract(contract){
        console.log(contract);
        this.setState({
            farContract: contract
        })
    }

    setContracts(nearContract, farContract){
        this.setState({
            nearContract, 
            farContract, 
        });

        var now = Date.now();
        console.log(this.futureWsClient);
        this.sendQuery(nearContract.contractCode, '1day', 
            Math.floor(now/1000-3600*24), 
            Math.floor(now/1000), 
            this.futureWsClient);
    }

    sendQuery(contractCode, period, start, end, wsClient){
        var postData = JSON.stringify({
            "req": `market.${contractCode}.kline.${period}`,
            "id": "id4",
            "from": start,
            "to": end, 
        });
        // wsClient.sendMessage(postData);
    }

    updateData(data){
        console.log(data);
    }

    render(){
        return <div>
            <h2>{showContractCode(this.state.nearContract)} vs {showContractCode(this.state.farContract)}</h2>
        </div>
    }
}

export default CompareView;