import React, { Component } from 'react';
import { Charts, ChartContainer, ChartRow, YAxis, LineChart } from "react-timeseries-charts";
import { TimeSeries, TimeRange, TimeEvent } from "pondjs";

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
            contractsDailySeries: {},
            nearContractDailySeries: null,
        }

        this.futureWsClient = props.futureWsClient;
        this.swapWsClient = props.swapWsClient;
        console.log(props);

        this.setNearContract = this.setNearContract.bind(this);
        this.setFarContract = this.setFarContract.bind(this);
        this.setContracts = this.setContracts.bind(this);
        this.nearContractCode = this.nearContractCode.bind(this);
        this.dataToEvents = this.dataToEvents.bind(this);

    }

    nearContractCode(){
        var nearContract = this.state.nearContract;
        if(nearContract == null){
            return "";
        }
        return nearContract.contractCode;
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

    dataToEvents(data){
        return data.map((e,i)=>{
            return new TimeEvent(new Date(e.id*1000), e);
        });
    }

    updateData(data){
        console.log(data);
        var rep = data.rep;
        var m = rep.match(/market\.([\w\-_]+)\.kline\.1day/);
        if(m!=null){
            var contractCode = m[1];
            var contractsDailySeries = this.state.contractsDailySeries;
            contractsDailySeries[contractCode] = data.data;

            var nearContractDailySeries = this.state.nearContractDailySeries;
            if(this.state.nearContract != null && contractCode == this.state.nearContract.contractCode){
                nearContractDailySeries = new TimeSeries({
                    name: "near contract daily price", 
                    columns: ['time', 'close'], 
                    events: this.dataToEvents(data.data), 
                });
            }

            
            this.setState({
                contractsDailySeries, 
                nearContractDailySeries
            });
        }
    }

    render(){
        const rawData = this.state.contractsDailySeries[this.nearContractCode()];
        let nearContractDailyChart = null;
        if (rawData != null && rawData.length>0){
            var timeseries = this.state.nearContractDailySeries;
            nearContractDailyChart = <div>
                <h2>{this.state.nearContract.contractCode} Close</h2>
                <ChartContainer width={800} timeRange={timeseries.range()}>
                    <ChartRow height="200" >
                        <YAxis
                            id="price"
                            label="Price ($)"
                            min={0}
                            max={timeseries.max("close")}
                            width="60" format="$,.2f"/>
                        <Charts>
                            <LineChart columns={["close"]} axis="price" series={timeseries}/>
                        </Charts>
                    </ChartRow>
                </ChartContainer>
            </div>
        }
        return <div>
            <h2>{showContractCode(this.state.nearContract)} vs {showContractCode(this.state.farContract)}</h2>
            {nearContractDailyChart}
        </div>
    }
}

export default CompareView;