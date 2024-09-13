import React from 'react'
import { Tab, Tabs, RadioGroup, Radio, FormGroup, InputGroup } from "@blueprintjs/core";
import "../node_modules/@blueprintjs/core/lib/css/blueprint.css";
import "../node_modules/@blueprintjs/icons/lib/css/blueprint-icons.css";
import "../node_modules/normalize.css/normalize.css";
import sanchoPParam from "./sanchoPParam.json"
import {
    Address,
    TransactionUnspentOutput,
    TransactionUnspentOutputs,
    TransactionOutput,
    Value,
    TransactionBuilder,
    TransactionBuilderConfigBuilder,
    LinearFee,
    BigNum,
    TransactionWitnessSet,
    Transaction,
    Credential,
    PublicKey,
    Ed25519KeyHash,
    CertificatesBuilder,
    Anchor,
    VotingBuilder,
    Voter,
    GovernanceActionId,
    TransactionHash,
    VotingProcedure,
    VotingProposalBuilder,
    AnchorDataHash,
    URL,
    UnitInterval,
    ChangeConfig,
    PlutusScript,
    ExUnitPrices,
    PlutusScripts,
    Redeemers,
    Costmdls,
    CostModel,
    Language,
    Int,
    NativeScripts,
    NativeScript,
    ScriptPubkey,
    ScriptAll,
    RewardAddress,
    NativeScriptSource,
} from "@emurgo/cardano-serialization-lib-asmjs"
import "./App.css";
import {
    buildAuthorizeHotCredCert,
    buildResignColdCredCert,
    keyHashStringToCredential,
} from './utils.js';

let Buffer = require('buffer/').Buffer

class App extends React.Component {
    constructor(props)
    {
        super(props);

        this.state = {
            selectedTabId: "1",
            whichWalletSelected: undefined,
            walletFound: false,
            walletIsEnabled: false,
            walletName: undefined,
            walletIcon: undefined,
            walletAPIVersion: undefined,
            wallets: [],
            networkId: undefined,
            Utxos: undefined,
            balance: undefined,
            changeAddress: undefined,
            rewardAddress: undefined,
            usedAddress: undefined,
            assetNameHex: "4c494645",
            // CIP-95 Stuff
            signAndSubmitError: undefined,
            buildingError: undefined,
            supportedExtensions: [],
            enabledExtensions: [],
            selected95BasicTabId: "1",
            selected95ActionsTabId: "1",
            selected95ComboTabId: "1",
            selected95MiscTabId: "1",
            selected95CCTabId: "1",
            selectedCIP95: true,
            // Keys
            dRepKey: undefined,
            dRepID: undefined,
            dRepIDBech32: undefined,
            regStakeKeys: [],
            unregStakeKeys: [],
            regStakeKey: undefined,
            unregStakeKey: undefined,
            regStakeKeyHashHex: undefined,
            unregStakeKeyHashHex: undefined,
            // Txs
            seeCombos: false,
            seeGovActs: false,
            seeCCCerts: false,
            seeMisc: false,
            certsInTx: [],
            votesInTx: [],
            govActsInTx: [],
            cip95ResultTx: "",
            cip95ResultHash: "",
            cip95ResultWitness: "",
            cip95MetadataURL: undefined,
            cip95MetadataHash: undefined,
            certBuilder: undefined,
            votingBuilder: undefined,
            govActionBuilder: undefined,
            treasuryDonationAmount: undefined,
            treasuryValueAmount: undefined,
            // Certs
            voteDelegationTarget: "",
            voteDelegationStakeCred: "",
            dRepRegTarget: "",
            dRepDeposit: "500000000",
            voteGovActionTxHash: "ad70b525212e01d5b6c7216e9b8163e27f90b7d0282f85ae57d125f732fc88ab",
            voteGovActionIndex: "0",
            voteChoice: "yes",
            stakeKeyReg: "",
            stakeKeyCoin: "2000000",
            stakeKeyWithCoin: false,
            stakeKeyUnreg: "",
            totalRefunds: undefined,
            // Combo certs
            comboPoolHash: "",
            comboStakeCred: "",
            comboStakeRegCoin: "2000000",
            comboVoteDelegTarget: "",
            // see things
            seeCIP95: false,
            seeCIP30: false,
            // multi-sig-cc
            multiSigScript: undefined,
            requiredSigningKeys: [],
        }

        /**
         * When the wallet is connect it returns the connector which is
         * written to this API variable and all the other operations
         * run using this API object
         */
        this.API = undefined;

        this.protocolParams = {
            linearFee: {
                minFeeA: "44",
                minFeeB: "155381",
            },
            minUtxo: "1000000",
            poolDeposit: "500000000",
            keyDeposit: "2000000",
            maxValSize: 5000,
            maxTxSize: 16384,
            priceMem: 0.0577,
            priceStep: 0.0000721,
            coinsPerUTxOByte: "4310",
        }
        this.pollWallets = this.pollWallets.bind(this);
    }

    /**
     * Poll the wallets it can read from the browser.
     * Sometimes the html document loads before the browser initialized browser plugins (like Nami or Flint).
     * So we try to poll the wallets 3 times (with 1 second in between each try).
     *
     * @param count The current try count.
     */
    pollWallets = (count = 0) => {
        const wallets = [];
        for(const key in window.cardano) {
            if (window.cardano[key].enable && wallets.indexOf(key) === -1) {
                wallets.push(key);
            }
        }
        if (wallets.length === 0 && count < 3) {
            setTimeout(() => {
                this.pollWallets(count + 1);
            }, 1000);
            return;
        }
        this.setState({
            wallets,
            whichWalletSelected: wallets[0]
        }, () => {
            this.refreshData()
        });
    }

    handleWalletSelect = (obj) => {
        const whichWalletSelected = obj.target.value
        this.setState({whichWalletSelected},
            () => {
                this.refreshData()
            })
    }

    checkIfWalletFound = () => {
        const walletKey = this.state.whichWalletSelected;
        const walletFound = !!window?.cardano?.[walletKey];
        this.setState({walletFound})
        return walletFound;
    }

    checkIfWalletEnabled = async () => {
        let walletIsEnabled = false;
        try {
            const walletName = this.state.whichWalletSelected;
            walletIsEnabled = await window.cardano[walletName].isEnabled();
        } catch (err) {
            console.log(err)
        }
        this.setState({walletIsEnabled});
        return walletIsEnabled;
    }

    enableWallet = async () => {
        const walletKey = this.state.whichWalletSelected;
        try {
            this.API = await window.cardano[walletKey].enable();
        } catch(err) {
            console.log(err);
        }
        return this.checkIfWalletEnabled();
    }

    getAPIVersion = () => {
        const walletKey = this.state.whichWalletSelected;
        const walletAPIVersion = window?.cardano?.[walletKey].apiVersion;
        this.setState({walletAPIVersion})
        return walletAPIVersion;
    }

    getWalletName = () => {
        const walletKey = this.state.whichWalletSelected;
        const walletName = window?.cardano?.[walletKey].name;
        this.setState({walletName})
        return walletName;
    }

    getSupportedExtensions = () => {
        const walletKey = this.state.whichWalletSelected;
        let supportedExtensions = [];
        try {
            supportedExtensions = window?.cardano?.[walletKey]?.supportedExtensions;
        } catch (err) {
            console.log("Error getting supported extensions")
            console.log(err)
        }
        this.setState({supportedExtensions})
    }

    getEnabledExtensions = async () => {
        try {
            const enabledExtensions = await this.API.getExtensions();
            this.setState({enabledExtensions})
        } catch (err) {
            console.log(err)
        }
    }

    getNetworkId = async () => {
        try {
            const networkId = await this.API.getNetworkId();
            this.setState({networkId})
        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Gets the UTXOs from the user's wallet and then
     * stores in an object in the state
     * @returns {Promise<void>}
     */
    getUtxos = async () => {
        let Utxos = [];
        try {
            const rawUtxos = await this.API.getUtxos();
            for (const rawUtxo of rawUtxos) {
                const utxo = TransactionUnspentOutput.from_bytes(Buffer.from(rawUtxo, "hex"));
                const input = utxo.input();
                const txid = Buffer.from(input.transaction_id().to_bytes(), "utf8").toString('hex');
                const txindx = input.index();
                const output = utxo.output();
                const amount = output.amount().coin().to_str(); // ADA amount in lovelace
                const multiasset = output.amount().multiasset();
                let multiAssetStr = "";
                if (multiasset) {
                    const keys = multiasset.keys() // policy Ids of thee multiasset
                    const N = keys.len();
                    // console.log(`${N} Multiassets in the UTXO`)
                    for (let i = 0; i < N; i++){
                        const policyId = keys.get(i);
                        const policyIdHex = Buffer.from(policyId.to_bytes(), "utf8").toString('hex');
                        // console.log(`policyId: ${policyIdHex}`)
                        const assets = multiasset.get(policyId)
                        const assetNames = assets.keys();
                        const K = assetNames.len()
                        // console.log(`${K} Assets in the Multiasset`)

                        for (let j = 0; j < K; j++) {
                            const assetName = assetNames.get(j);
                            const assetNameString = Buffer.from(assetName.name(),"utf8").toString();
                            const assetNameHex = Buffer.from(assetName.name(),"utf8").toString("hex")
                            const multiassetAmt = multiasset.get_asset(policyId, assetName)
                            multiAssetStr += `+ ${multiassetAmt.to_str()} + ${policyIdHex}.${assetNameHex} (${assetNameString})`
                            // console.log(assetNameString)
                            // console.log(`Asset Name: ${assetNameHex}`)
                        }
                    }
                }
                const obj = {
                    txid: txid,
                    txindx: txindx,
                    amount: amount,
                    str: `${txid} #${txindx} = ${amount}`,
                    multiAssetStr: multiAssetStr,
                    TransactionUnspentOutput: utxo
                }
                Utxos.push(obj);
                // console.log(`utxo: ${str}`)
            }
            this.setState({Utxos})
        } catch (err) {
            console.log(err)
        }
    }
    getCollaterals = async()=>{
        const rawUtxos = await this.API.getUtxos();
        return rawUtxos.map(rawUtxo=>{
            TransactionUnspentOutput.from_bytes(Buffer.from(rawUtxo, "hex"))
        })
    }

    getBalance = async () => {
        try {
            const balanceCBORHex = await this.API.getBalance();
            const balance = Value.from_bytes(Buffer.from(balanceCBORHex, "hex")).coin().to_str();
            this.setState({balance})
        } catch (err) {
            console.log(err)
        }
    }

    getChangeAddress = async () => {
        try {
            const raw = await this.API.getChangeAddress();
            let address = Address.from_bytes(Buffer.from(raw, "hex"))
            const changeAddress = address.to_bech32(address.network_id == 0?"addr":"addr_test")
            this.setState({changeAddress})
        } catch (err) {
            console.log(err)
        }
    }

    getRewardAddresses = async () => {
        try {
            const raw = await this.API.getRewardAddresses();
            const rawFirst = raw[0];
            const rewardAddress = Address.from_bytes(Buffer.from(rawFirst, "hex")).to_bech32()
            // console.log(rewardAddress)
            this.setState({rewardAddress})
        } catch (err) {
            console.log(err)
        }
    }

    getUsedAddresses = async () => {
        try {
            const raw = await this.API.getUsedAddresses();
            const rawFirst = raw[0];
            const usedAddress = Address.from_bytes(Buffer.from(rawFirst, "hex")).to_bech32()
            this.setState({usedAddress})

        } catch (err) {
            console.log(err)
        }
    }

    checkIfCIP95MethodsAvailable = async () => {
        const hasCIP95Methods = ( 
            this.API.cip95.hasOwnProperty('getPubDRepKey') 
            && this.API.cip95.hasOwnProperty('getRegisteredPubStakeKeys')
            && this.API.cip95.hasOwnProperty('getUnregisteredPubStakeKeys'));
        return hasCIP95Methods;
    }

    refreshCIP30State = async () => {
        await this.setState({
            Utxos: null,
            balance: null,
            changeAddress: null,
            rewardAddress: null,
            usedAddress: null,
            supportedExtensions: [],
            enabledExtensions: [],
        });
    }

    refreshCIP95State = async () => {
        await this.setState({
            // Keys
            dRepKey: undefined,
            dRepID: undefined,
            dRepIDBech32: undefined,
            regStakeKeys: [],
            unregStakeKeys: [],
            regStakeKey: undefined,
            unregStakeKey: undefined,
            regStakeKeyHashHex: undefined,
            unregStakeKeyHashHex: undefined,
            // Txs
            signAndSubmitError: undefined,
            buildingError: undefined,
            seeCombos: false,
            seeGovActs: false,
            seeMisc: false,
            certsInTx: [],
            votesInTx: [],
            govActsInTx: [],
            cip95ResultTx: "",
            cip95ResultHash: "",
            cip95ResultWitness: "",
            cip95MetadataURL: undefined,
            cip95MetadataHash: undefined,
            certBuilder: undefined,
            votingBuilder: undefined,
            govActionBuilder: undefined,
            treasuryDonationAmount: undefined,
            treasuryValueAmount: undefined,
            // Certs
            voteDelegationTarget: "",
            voteDelegationStakeCred: "",
            dRepRegTarget: "",
            dRepDeposit: "500000000",
            voteGovActionTxHash: "ad70b525212e01d5b6c7216e9b8163e27f90b7d0282f85ae57d125f732fc88ab",
            voteGovActionIndex: "0",
            voteChoice: "yes",
            stakeKeyReg: "",
            stakeKeyCoin: "2000000",
            stakeKeyWithCoin: false,
            stakeKeyUnreg: "",
            totalRefunds: undefined,
            // Combo certs
            comboPoolHash: "",
            comboStakeCred: "",
            comboStakeRegCoin: "2000000",
            comboVoteDelegTarget: "",
            // multi-sig-cc
            // multiSigScript: undefined,
            requiredSigningKeys: [],
        });
    }

    /**
     * Refresh all the data from the user's wallet
     * @returns {Promise<void>}
     */
    refreshData = async () => {
        try {
            const walletFound = this.checkIfWalletFound();
            this.resetSomeState();
            this.refreshErrorState();
            // If wallet found and CIP-95 selected perform CIP-30 initial API calls
            if (walletFound) {
                await this.getAPIVersion();
                await this.getWalletName();
                this.getSupportedExtensions();
                // If CIP-95 checkbox selected attempt to connect to wallet with CIP-95
                let walletEnabled;
                let hasCIP95Methods;
                if (this.state.selectedCIP95) {
                    walletEnabled = await this.enableCIP95Wallet();
                    hasCIP95Methods = await this.checkIfCIP95MethodsAvailable();
                } else {
                    // else connect to wallet without CIP-95
                    walletEnabled = await this.enableWallet()
                    await this.refreshCIP95State();
                }
                // If wallet is enabled/connected
                if (walletEnabled) {
                    // CIP-30 API calls
                    await this.getNetworkId();
                    await this.getUtxos();
                    await this.getBalance();
                    await this.getChangeAddress();
                    await this.getRewardAddresses();
                    await this.getUsedAddresses();
                    await this.getEnabledExtensions();
                    // If connection was CIP95 and wallet has CIP95 methods
                    if (hasCIP95Methods) {
                        // CIP-95 API calls
                        await this.getPubDRepKey();
                        await this.getRegisteredPubStakeKeys();
                        await this.getUnregisteredPubStakeKeys();
                        this.createNativeScript();
                    }
                // else if connection failed, reset all state
                } else {
                    this.setState({walletIsEnabled: false})
                    await this.refreshCIP30State();
                    await this.refreshCIP95State();
                }
            // else if there are no wallets found, reset all state
            } else {
                this.setState({walletIsEnabled: false})
                await this.refreshCIP30State();
                await this.refreshCIP95State();
            }
        } catch (err) {
            console.log(err)
        }
    }

    /**
     * Every transaction starts with initializing the
     * TransactionBuilder and setting the protocol parameters
     * This is boilerplate
     * @returns {Promise<TransactionBuilder>}
     */
    initTransactionBuilder = async () => {
        const txBuilder = TransactionBuilder.new(
            TransactionBuilderConfigBuilder.new()
                .fee_algo(LinearFee.new(BigNum.from_str(this.protocolParams.linearFee.minFeeA), BigNum.from_str(this.protocolParams.linearFee.minFeeB)))
                .pool_deposit(BigNum.from_str(this.protocolParams.poolDeposit))
                .key_deposit(BigNum.from_str(this.protocolParams.keyDeposit))
                .coins_per_utxo_byte(BigNum.from_str(this.protocolParams.coinsPerUTxOByte))
                .max_value_size(this.protocolParams.maxValSize)
                .max_tx_size(this.protocolParams.maxTxSize)
                .prefer_pure_change(true)
                .ex_unit_prices(
                    ExUnitPrices.new(
                        UnitInterval.new(BigNum.from_str("577"),BigNum.from_str("10000")), 
                        UnitInterval.new(BigNum.from_str("721"),BigNum.from_str("10000000"))
                    )
                )
                .build()
        );
        return txBuilder
    }
    
    /**
     * Builds an object with all the UTXOs from the user's wallet
     * @returns {Promise<TransactionUnspentOutputs>}
     */
    getTxUnspentOutputs = async () => {
        let txOutputs = TransactionUnspentOutputs.new()
        for (const utxo of this.state.Utxos) {
            txOutputs.add(utxo.TransactionUnspentOutput)
        }
        return txOutputs
    }

    getPubDRepKey = async () => {
        try {
            // From wallet get pub DRep key 
            const dRepKey = await this.API.cip95.getPubDRepKey();
            const dRepID = (PublicKey.from_hex(dRepKey)).hash();
            this.setState({dRepKey});
            this.setState({dRepID : dRepID.to_hex()});
            const dRepIDBech32 = dRepID.to_bech32('drep');
            this.setState({dRepIDBech32});
            // Default use the wallet's DRepID for DRep registration
            this.setState({dRepRegTarget: dRepIDBech32});
            // Default use the wallet's DRepID for Vote delegation target
            this.setState({voteDelegationTarget: dRepIDBech32});
            // Default use the wallet's DRepID for combo Vote delegation target
            this.setState({comboVoteDelegTarget: dRepIDBech32});
        } catch (err) {
            console.log(err)
        }
    }

    getRegisteredPubStakeKeys = async () => {
        try {
            const raw = await this.API.cip95.getRegisteredPubStakeKeys();
            if (raw.length < 1){
                // console.log("No Registered Pub Stake Keys");
            } else {
                // Set array
                const regStakeKeys = raw;
                this.setState({regStakeKeys})
                // Just use the first key for now 
                const regStakeKey = regStakeKeys[0];
                this.setState({regStakeKey})
                // Hash the stake key
                const stakeKeyHash = ((PublicKey.from_hex(regStakeKey)).hash()).to_hex();
                this.setState({regStakeKeyHashHex: stakeKeyHash});
                // Set default stake key for vote delegation to the first registered key
                this.setState({voteDelegationStakeCred : stakeKeyHash});
                // Set default stake key to unregister as the first registered key
                this.setState({stakeKeyUnreg : stakeKeyHash});
                // Set default stake key for combo certs as the first registered key
                this.setState({comboStakeCred : stakeKeyHash});
            }
        } catch (err) {
            console.log(err)
        }
    }

    getUnregisteredPubStakeKeys = async () => {
        try {
            const raw = await this.API.cip95.getUnregisteredPubStakeKeys();
            if (raw.length < 1){
                // console.log("No Registered Pub Stake Keys");
            } else {
                // Set array
                const unregStakeKeys = raw;
                this.setState({unregStakeKeys})
                // Just use the first key for now 
                const unregStakeKey = unregStakeKeys[0];
                this.setState({unregStakeKey})
                // Hash the stake key
                const stakeKeyHash = ((PublicKey.from_hex(unregStakeKey)).hash()).to_hex();
                this.setState({unregStakeKeyHashHex: stakeKeyHash});
                // Set default stake key to register as the first unregistered key
                this.setState({stakeKeyReg : stakeKeyHash});
            }
        } catch (err) {
            console.log(err)
        }
    }

    enableCIP95Wallet = async () => {
        const walletKey = this.state.whichWalletSelected;
        try {
            this.API = await window.cardano[walletKey].enable({extensions: [{cip: 95}]});
        } catch(err) {
            console.log(err);
        }
        return this.checkIfWalletEnabled();
    }

    handleTab95Id = (tabId) => this.setState({selectedTab95Id: tabId})

    handleCIP95Select = () => {
        const selectedCIP95 = !this.state.selectedCIP95;
        console.log("CIP-95 Selected?: ", selectedCIP95);
        this.setState({selectedCIP95});
    }

    handleSeeCIP95 = () => {
        const seeCIP95 = !this.state.seeCIP95;
        this.setState({seeCIP95});
    }

    handleSeeCIP30 = () => {
        const seeCIP30 = !this.state.seeCIP30;
        this.setState({seeCIP30});
    }

    handleInputToCredential = async (input) => {
        try {
          const keyHash = Ed25519KeyHash.from_hex(input);
          const cred = Credential.from_keyhash(keyHash);
          return cred;
        } catch (err1) {
          try {
            const keyHash = Ed25519KeyHash.from_bech32(input);
            const cred = Credential.from_keyhash(keyHash);
            return cred;
          } catch (err2) {
            console.error('Error in parsing credential, not Hex or Bech32:');
            console.error(err1, err2);
            this.setState({buildingError : {msg: 'Error in parsing credential, not Hex or Bech32', err: err2}});
            return null;
          }
        }
    }

    // ew! who wrote this?
    resetSomeState = async () => { 
        this.setState({cip95ResultTx : ""});
        this.setState({cip95ResultHash : ""});
        this.setState({certsInTx : []});
        this.setState({votesInTx : []});
        this.setState({govActsInTx : []});
        this.setState({certBuilder : undefined});
        this.setState({votingBuilder : undefined});
        this.setState({govActionBuilder : undefined});
    }

    refreshErrorState = async () => { 
        this.setState({buildingError : undefined});
        this.setState({signAndSubmitError : undefined});
    }

    getCertBuilder = async () => {
        if (this.state.certBuilder){
            return this.state.certBuilder;
        } else {
            return CertificatesBuilder.new();
        }
    }

    setCertBuilder = async (certBuilderWithCert) => {
        this.setState({certBuilder : certBuilderWithCert});

        let certs = certBuilderWithCert.build();
        let certsInJson = [];
        for (let i = 0; i < certs.len(); i++) {
            certsInJson.push(certs.get(i).to_json());
        }
        this.setState({certsInTx : certsInJson});
    }

    getVotingBuilder = async () => {
        let votingBuilder;
        if (this.state.votingBuilder){
            votingBuilder = this.state.votingBuilder;
        } else {
            votingBuilder = VotingBuilder.new();
        }
        return votingBuilder;
    }

    setVotingBuilder = async (votingBuilderWithVote) => {
        this.setState({votingBuilder : votingBuilderWithVote});
        this.setState({votesInTx : votingBuilderWithVote.build().to_json()});
    }

    getGovActionBuilder = async () => {
        let govActionBuilder;
        if (this.state.govActionBuilder){
            govActionBuilder = this.state.govActionBuilder;
        } else {
            govActionBuilder = VotingProposalBuilder.new();
        }
        return govActionBuilder;
    }

    setGovActionBuilder = async (govActionBuilderWithAction) => {
        this.setState({govActionBuilder : govActionBuilderWithAction});

        let actions = govActionBuilderWithAction.build();
        let actionsInJson = [];
        for (let i = 0; i < actions.len(); i++) {
            actionsInJson.push(actions.get(i).to_json());
        }
        this.setState({govActsInTx : actionsInJson});
    }

    buildSubmitConwayTx = async (builderSuccess) => {
        try {
            console.log("Building, signing and submitting transaction")
            // Abort if error before building Tx
            if (!(await builderSuccess)){
                throw new Error("Error before building Tx, aborting Tx build.")
            }
            // Initialize builder with protocol parameters
            const txBuilder = await this.initTransactionBuilder();
            const transactionWitnessSet = TransactionWitnessSet.new();

            // Add certs, votes, gov actions or donation to the transaction
            if (this.state.certBuilder){
                txBuilder.set_certs_builder(this.state.certBuilder);
                this.setState({certBuilder : undefined});
            }
            if (this.state.votingBuilder){
                txBuilder.set_voting_builder(this.state.votingBuilder);
                this.setState({votingBuilder : undefined});
            }
            if (this.state.govActionBuilder){
                txBuilder.set_voting_proposal_builder(this.state.govActionBuilder);
                this.setState({govActionBuilder : undefined});
            }
            if (this.state.treasuryDonationAmount){
                txBuilder.set_donation(BigNum.from_str(this.state.treasuryDonationAmount));
            }
            if (this.state.treasuryValueAmount){
                txBuilder.set_current_treasury_value(BigNum.from_str(this.state.treasuryValueAmount));
            }
            if(this.state.guardrailScriptUsed){
                try{
                    const scripts = PlutusScripts.new();
                    scripts.add(PlutusScript.from_bytes_v3(Buffer.from(this.state.guardrailScript,'hex')));
                    transactionWitnessSet.set_plutus_scripts(scripts)

                    const redeemers = Redeemers.new();
                    this.state.redeemers.forEach(r=>{
                        redeemers.add(r);
                    })
                    transactionWitnessSet.set_redeemers(redeemers)

                    const costModels = Costmdls.new()
                    let v1costModel = CostModel.new()
                    sanchoPParam.costModels.PlutusV1.forEach((val,index)=>{
                        v1costModel.set(index,Int.new_i32(val))
                    })
                    costModels.insert(Language.new_plutus_v1(),v1costModel)

                    let v2costModel = CostModel.new()
                    sanchoPParam.costModels.PlutusV2.forEach((val,index)=>{
                        v2costModel.set(index,Int.new_i32(val))
                    })
                    costModels.insert(Language.new_plutus_v2(),v2costModel)

                    let v3costModel = CostModel.new()
                    sanchoPParam.costModels.PlutusV3.forEach((val,index)=>{
                        v3costModel.set(index,Int.new_i32(val))
                    })
                    costModels.insert(Language.new_plutus_v3(),v3costModel)
                                        
                    txBuilder.calc_script_data_hash(costModels)
                }
                catch(e){
                    console.error("App.buildSubmitConwayTx : if(this.state.guardrailScriptUsed)",e)
                    throw e
                }
            }
            
            // Set output and change addresses to those of our wallet
            const shelleyOutputAddress = Address.from_bech32(this.state.usedAddress);
            const shelleyChangeAddress = Address.from_bech32(this.state.changeAddress);
            
            // Add output of 1 ADA plus total needed for refunds 
            let outputValue = BigNum.from_str('1000000')

            // Ensure the total output is larger than total implicit inputs (refunds / withdrawals)
            if (!txBuilder.get_implicit_input().is_zero()){
                outputValue = outputValue.checked_add(txBuilder.get_implicit_input().coin())
            }

            // add output to the transaction
            txBuilder.add_output(
                TransactionOutput.new(
                    shelleyOutputAddress,
                    Value.new(outputValue)
                ),
            );
            // Find the available UTxOs in the wallet and use them as Inputs for the transaction
            await this.getUtxos();
            const txUnspentOutputs = await this.getTxUnspentOutputs();

            // Use UTxO selection strategy 2 and add change address to be used if needed
            const changeConfig = ChangeConfig.new(shelleyChangeAddress);
            
            // Use UTxO selection strategy 2 if strategy 3 fails
            try {
                txBuilder.add_inputs_from_and_change(txUnspentOutputs, 3, changeConfig);
            } catch (e) {
                console.error(e);
                txBuilder.add_inputs_from_and_change(txUnspentOutputs, 2, changeConfig);
            }

            // Build transaction body
            const txBody = txBuilder.build();
            // Make a full transaction, passing in empty witness set
            const tx = Transaction.new(
                txBody,
                TransactionWitnessSet.from_bytes(transactionWitnessSet.to_bytes()),
            );

            // Ask wallet to to provide signature (witnesses) for the transaction
            let txVkeyWitnesses;
            // Log the CBOR of tx to console
            console.log("UnsignedTx: ", Buffer.from(tx.to_bytes(), "utf8").toString("hex"));
            txVkeyWitnesses = await this.API.signTx(Buffer.from(tx.to_bytes(), "utf8").toString("hex"), true);
            // Create witness set object using the witnesses provided by the wallet
            txVkeyWitnesses = TransactionWitnessSet.from_bytes(Buffer.from(txVkeyWitnesses, "hex"));
            transactionWitnessSet.set_vkeys(txVkeyWitnesses.vkeys());
            // Build transaction with witnesses
            const signedTx = Transaction.new(
                tx.body(),
                transactionWitnessSet,
            );
            
            console.log("SignedTx: ", Buffer.from(signedTx.to_bytes(), "utf8").toString("hex"))
            // console.log("Signed Tx: ", signedTx.to_json());

            const cip95ResultWitness = Buffer.from(txVkeyWitnesses.to_bytes(), "utf8").toString("hex");
            this.setState({cip95ResultWitness});
            
            this.resetSomeState();

            if (await this.submitConwayTx(signedTx)){
                // Reset  state
                this.setState({cip95MetadataURL : undefined});
                this.setState({cip95MetadataHash : undefined});
                this.setState({totalRefunds : undefined});
            }
        } catch (err) {
            console.error("App.buildSubmitConwayTx",err);
            await this.refreshData();
            this.setState({signAndSubmitError : (err)})
        }
    }

    submitConwayTx = async (signedTx) => {
        try {
            const result = await this.API.submitTx(Buffer.from(signedTx.to_bytes(), "utf8").toString("hex"));
            console.log("Submitted transaction hash", result)
            // Set results so they can be rendered
            const cip95ResultTx = Buffer.from(signedTx.to_bytes(), "utf8").toString("hex");
            this.setState({cip95ResultTx});
            this.setState({cip95ResultHash : result});
            return true;
        } catch (err) {
            console.log("Error during submission of transaction");
            console.log(err);
            this.setState({signAndSubmitError : (err)})
            return false;
        }
    }

    addAuthorizeHotCredCert = async () => {
        this.refreshErrorState();
        let certBuilder = await this.getCertBuilder();
        console.log("Adding CC authorize hot credential cert to transaction")
        try {
            const certBuilderWithAuthorizeHotCredCert = buildAuthorizeHotCredCert(
                certBuilder, 
                this.state.coldCredential,
                this.state.hotCredential,
            );
            await this.setCertBuilder(certBuilderWithAuthorizeHotCredCert)
            return true;
        } catch (err) {
            this.setState({buildingError : String(err)})
            this.resetSomeState();
            console.log(err);
            return false;
        }
    }

    addResignColdCredCert = async () => {
        this.refreshErrorState();
        let certBuilder = await this.getCertBuilder();
        console.log("Adding CC resign cold credential cert to transaction")
        try {
            let certBuilderWithResignColdCredCert;
            if (this.state.cip95MetadataURL && this.state.cip95MetadataHash) {
                certBuilderWithResignColdCredCert = buildResignColdCredCert(
                certBuilder, 
                this.state.coldCredential,
                this.state.cip95MetadataURL,
                this.state.cip95MetadataHash
                );
            } else {
                certBuilderWithResignColdCredCert = buildResignColdCredCert(
                    certBuilder, 
                    this.state.coldCredential
                );
            }
            await this.setCertBuilder(certBuilderWithResignColdCredCert)
            return true;
        } catch (err) {
            this.setState({buildingError : String(err)})
            this.resetSomeState();
            console.log(err);
            return false;
        }
    }

    // Generate a all sign native script using connected wallet's keys
    createNativeScript = async () => {
        const scripts = NativeScripts.new();

        // get payment cred from change address add as script
        const changeAddress = Address.from_bech32(this.state.changeAddress);
        const paymentCred = changeAddress.payment_cred();
        const paymentCredHash = paymentCred.to_keyhash();

        const paymentKeyScript = NativeScript.new_script_pubkey(
            ScriptPubkey.new(paymentCredHash)
        );
        scripts.add(paymentKeyScript);

        // get stake cred from rewards address add as script
        const rewardAddress = RewardAddress.from_address(Address.from_bech32(this.state.rewardAddress));
        const stakeCred = rewardAddress.payment_cred();
        const stakeCredHash = stakeCred.to_keyhash();

        const stakeKeyScript = NativeScript.new_script_pubkey(
            ScriptPubkey.new(stakeCredHash)
        );
        scripts.add(stakeKeyScript);

        // get DRep cred from pub DRep key add as script
        // const dRepKeyScript = NativeScript.new_script_pubkey(
        //     ScriptPubkey.new(Ed25519KeyHash.from_hex(this.state.dRepID))
        // );
        // scripts.add(dRepKeyScript);

        const multiSigScript = NativeScript.new_script_all(
            ScriptAll.new(scripts)
        );
        
        // console.log("MultiSigScript: ", multiSigScript.to_json());
        // console.log("Script Hex", multiSigScript.to_hex())

        this.setState({multiSigScript});
    }

    handleMultiSigScriptInput = (input) => {
        // check that this is a Native Script
        try {
            // Set the state 
            const scripts = NativeScripts.from_hex(input);
            this.setState({multiSigScript: scripts});

            // Iterate through the scripts and get the required signing keys
            let requiredSigningKeys = [];
            for (let i = 0; i < scripts.len(); i++) {
                const script = scripts.get(i);
                requiredSigningKeys.push(script.required_keys());
            }
            this.setState({requiredSigningKeys});
        } catch (err) {
            console.error('Error in parsing native script:');
            console.error(err);
            this.setState({buildingError : {msg: 'Error in parsing native script', err: err}});
            return;
        };
    }

    addMultiSigVote = async () => {
        this.refreshErrorState();
        let votingBuilder = await this.getVotingBuilder();
        console.log("Adding a multisig CC vote to transaction")
        try {

            // Get the credential from script
            console.log("Your multisig script: ", this.state.multiSigScript.to_hex());
            const hotCredential = Credential.from_scripthash((this.state.multiSigScript).hash());
            const voter = Voter.new_constitutional_committee_hot_key(hotCredential);
            // What is being voted on
            const govActionId = GovernanceActionId.new(
                TransactionHash.from_hex(this.state.voteGovActionTxHash), this.state.voteGovActionIndex);
            // Voting choice
            let votingChoice;
            if ((this.state.voteChoice).toUpperCase() === "YES") {
                votingChoice = 1
            } else if ((this.state.voteChoice).toUpperCase() === "NO") {
                votingChoice = 0
            } else if ((this.state.voteChoice).toUpperCase() === "ABSTAIN") {
                votingChoice = 2
            }
            let votingProcedure;
            if (this.state.cip95MetadataURL && this.state.cip95MetadataHash) {
                const anchorURL = URL.new(this.state.cip95MetadataURL);
                const anchorHash = AnchorDataHash.from_hex(this.state.cip95MetadataHash);
                const anchor = Anchor.new(anchorURL, anchorHash);
                votingProcedure = VotingProcedure.new_with_anchor(votingChoice, anchor);
            } else {
                votingProcedure = VotingProcedure.new(votingChoice);
            };
            // Add vote to vote builder
            const multiSigScript = NativeScriptSource.new(this.state.multiSigScript);
            votingBuilder.add_with_native_script(voter, govActionId, votingProcedure, multiSigScript);
            await this.setVotingBuilder(votingBuilder)
            return true;
        } catch (err) {
            this.setState({buildingError : String(err)})
            this.resetSomeState();
            console.log(err);
            return false;
        }
    }

    addCCVote = async () => {
        this.refreshErrorState();
        let votingBuilder = await this.getVotingBuilder();
        console.log("Adding CC vote to transaction")
        try {
            const voter = Voter.new_constitutional_committee_hot_key(keyHashStringToCredential(this.state.hotCredential));
            // What is being voted on
            const govActionId = GovernanceActionId.new(
                TransactionHash.from_hex(this.state.voteGovActionTxHash), this.state.voteGovActionIndex);
            // Voting choice
            let votingChoice;
            if ((this.state.voteChoice).toUpperCase() === "YES") {
                votingChoice = 1
            } else if ((this.state.voteChoice).toUpperCase() === "NO") {
                votingChoice = 0
            } else if ((this.state.voteChoice).toUpperCase() === "ABSTAIN") {
                votingChoice = 2
            }
            let votingProcedure;
            if (this.state.cip95MetadataURL && this.state.cip95MetadataHash) {
                const anchorURL = URL.new(this.state.cip95MetadataURL);
                const anchorHash = AnchorDataHash.from_hex(this.state.cip95MetadataHash);
                const anchor = Anchor.new(anchorURL, anchorHash);
                votingProcedure = VotingProcedure.new_with_anchor(votingChoice, anchor);
            } else {
                votingProcedure = VotingProcedure.new(votingChoice);
            };
            // Add vote to vote builder
            votingBuilder.add(voter, govActionId, votingProcedure);
            await this.setVotingBuilder(votingBuilder)
            return true;
        } catch (err) {
            this.setState({buildingError : String(err)})
            this.resetSomeState();
            console.log(err);
            return false;
        }
    }

    async componentDidMount() {
        this.pollWallets();
        await this.refreshData();
    }

    render(){
        return (
            <div style={{margin: "20px"}}>

                <h1>✨Constitutional Committee test dApp✨</h1>

                <input type="checkbox" checked={this.state.selectedCIP95} onChange={this.handleCIP95Select}/> Enable CIP-95?

                <div style={{paddingTop: "10px"}}>
                    <div style={{marginBottom: 15}}>Select wallet:</div>
                    <RadioGroup
                        onChange={this.handleWalletSelect}
                        selectedValue={this.state.whichWalletSelected}
                        inline={true}
                        className="wallets-wrapper"
                    >
                        { this.state.wallets.map(key =>
                            <Radio
                                key={key}
                                className="wallet-label"
                                value={key}>
                                <img src={window.cardano[key].icon} width={24} height={24} alt={key}/>
                                {window.cardano[key].name} ({key})
                            </Radio>
                        )}
                    </RadioGroup>
                </div>
                <button style={{padding: "20px"}} onClick={this.refreshData}>Refresh</button> 
                
                <hr style={{marginTop: "10px", marginBottom: "10px"}}/>
                <label>
                <span style={{ paddingRight: "5px", paddingLeft: '20px' }}>See CIP30 info?</span>
                    <input
                        type="checkbox"
                        style={{ paddingRight: "10px", paddingLeft: "10px"}}
                        checked={this.state.seeCIP30}
                        onChange={() => this.setState({ seeCIP30: !this.state.seeCIP30 })}
                    />
                </label>

                <label>
                <span style={{ paddingRight: "5px", paddingLeft: '20px' }}>See CIP95 info?</span>
                    <input
                        type="checkbox"
                        style={{ paddingRight: "10px", paddingLeft: "10px"}}
                        checked={this.state.seeCIP95}
                        onChange={() => this.setState({ seeCIP95: !this.state.seeCIP95 })}
                    />
                </label>
                <hr style={{marginTop: "10px", marginBottom: "10px"}}/>

                { this.state.seeCIP30 && (
                    <>
                    <h3>CIP-30 Initial API</h3>
                    <p><span style={{fontWeight: "bold"}}>Wallet Found: </span>{`${this.state.walletFound}`}</p>
                    <p><span style={{fontWeight: "bold"}}>Wallet Connected: </span>{`${this.state.walletIsEnabled}`}</p>
                    <p><span style={{ fontWeight: "bold" }}>.supportedExtensions:</span></p>
                    <ul>{this.state.supportedExtensions && this.state.supportedExtensions.length > 0 ? this.state.supportedExtensions.map((item, index) => ( <li style={{ fontSize: "12px" }} key={index}>{item.cip}</li>)) : <li>No supported extensions found.</li>}</ul>
                    <h3>CIP-30 Full API</h3>
                    <p><span style={{fontWeight: "bold"}}>Network Id (0 = testnet; 1 = mainnet): </span>{this.state.networkId}</p>
                    <p><span style={{fontWeight: "bold"}}>.getUTxOs(): </span>{this.state.Utxos?.map(x => <li style={{fontSize: "10px"}} key={`${x.str}${x.multiAssetStr}`}>{`${x.str}${x.multiAssetStr}`}</li>)}</p>
                    <p style={{paddingTop: "10px"}}><span style={{fontWeight: "bold"}}>Balance: </span>{this.state.balance}</p>
                    <p><span style={{fontWeight: "bold"}}>.getChangeAddress(): </span>{this.state.changeAddress}</p>
                    <p><span style={{fontWeight: "bold"}}>.getRewardsAddress(): </span>{this.state.rewardAddress}</p>
                    <p><span style={{ fontWeight: "bold" }}>.getExtensions():</span></p>
                    <ul>{this.state.enabledExtensions && this.state.enabledExtensions.length > 0 ? this.state.enabledExtensions.map((item, index) => ( <li style={{ fontSize: "12px" }} key={index}>{item.cip}</li>)) : <li>No extensions enabled.</li>}</ul>
                    <hr style={{marginTop: "40px", marginBottom: "10px"}}/>
                    </>
                )}
                
                { this.state.seeCIP95 && (
                    <>
                    <h1>CIP-95 🤠</h1>
                    <p><span style={{fontWeight: "bold"}}>.cip95.getPubDRepKey(): </span>{this.state.dRepKey}</p>
                    <p><span style={{fontWeight: "lighter"}}>Hex DRep ID (Pub DRep Key hash): </span>{this.state.dRepID}</p>
                    <p><span style={{fontWeight: "lighter"}}>Bech32 DRep ID (Pub DRep Key hash): </span>{this.state.dRepIDBech32}</p>
                    <p><span style={{ fontWeight: "bold" }}>.cip95.getRegisteredPubStakeKeys():</span></p>
                    <ul>{this.state.regStakeKeys && this.state.regStakeKeys.length > 0 ? this.state.regStakeKeys.map((item, index) => ( <li style={{ fontSize: "12px" }} key={index}>{item}</li>)) : <li>No registered public stake keys returned.</li>}</ul>
                    <p><span style={{fontWeight: "lighter"}}> First registered Stake Key Hash (hex): </span>{this.state.regStakeKeyHashHex}</p>
                    <p><span style={{ fontWeight: "bold" }}>.cip95.getUnregisteredPubStakeKeys():</span></p>
                    <ul>{this.state.regStakeKeys && this.state.unregStakeKeys.length > 0 ? this.state.unregStakeKeys.map((item, index) => ( <li style={{ fontSize: "12px" }} key={index}>{item}</li>)) : <li>No unregistered public stake keys returned.</li>}</ul>
                    <p><span style={{fontWeight: "lighter"}}> First unregistered Stake Key Hash (hex): </span>{this.state.unregStakeKeyHashHex}</p>
                    <hr style={{marginTop: "10px", marginBottom: "10px"}}/>
                    </>
                )}

                <Tabs id="cip95-basic" vertical={true} onChange={this.handle95TabId} selectedTab95Id={this.state.selected95BasicTabId}>
                    <Tab id="1" title="🔥 Authorize CC Hot Credential" panel={
                        <div style={{marginLeft: "20px"}}>
                            <FormGroup
                                helperText="(Bech32 or Hex encoded)"
                                label="CC Cold Credential"
                            >
                                <InputGroup
                                    disabled={false}
                                    leftIcon="id-number"
                                    onChange={(event) => this.setState({coldCredential: event.target.value})}
                                />
                            </FormGroup>

                            <FormGroup
                                helperText="(Bech32 or Hex encoded)"
                                label="CC Hot Credential"
                            >
                                <InputGroup
                                    disabled={false}
                                    leftIcon="id-number"
                                    onChange={(event) => this.setState({hotCredential: event.target.value})}
                                />
                            </FormGroup>
                            <button style={{padding: "10px"}} onClick={ () => this.addAuthorizeHotCredCert()}>Build, add to Tx</button>
                        </div>
                    } />
                    <Tab id="2" title="🧊 Resign CC Cold Credential" panel={
                        <div style={{marginLeft: "20px"}}>
                            <FormGroup
                                helperText="(Bech32 or Hex encoded)"
                                label="CC Cold Credential"
                            >
                                <InputGroup
                                    disabled={false}
                                    leftIcon="id-number"
                                    onChange={(event) => this.setState({coldCredential: event.target.value})}
                                />
                            </FormGroup>

                            <FormGroup
                                label="Optional: Metadata URL"
                            >
                                <InputGroup
                                    disabled={false}
                                    leftIcon="id-number"
                                    onChange={(event) => this.setState({cip95MetadataURL: event.target.value})}
                                    defaultValue={this.state.cip95MetadataURL}
                                />
                            </FormGroup>

                            <FormGroup
                                helperText=""
                                label="Optional: Metadata Hash"
                            >
                                <InputGroup
                                    disabled={false}
                                    leftIcon="id-number"
                                    onChange={(event) => this.setState({cip95MetadataHash: event.target.value})}
                                />
                            </FormGroup>
                            <button style={{padding: "10px"}} onClick={ () => this.addResignColdCredCert()}>Build, add to Tx</button>
                        </div>
                    } />
                    <Tab id="3" title="🗳 CC Vote" panel={
                        <div style={{marginLeft: "20px"}}>

                            <FormGroup
                                helperText="(Bech32 or Hex encoded)"
                                label="CC Hot Credential"
                            >
                                <InputGroup
                                    disabled={false}
                                    leftIcon="id-number"
                                    onChange={(event) => this.setState({hotCredential: event.target.value})}
                                />
                            </FormGroup>

                            <FormGroup
                                helperText=""
                                label="Gov Action Tx Hash"
                            >
                                <InputGroup
                                    disabled={false}
                                    leftIcon="id-number"
                                    onChange={(event) => this.setState({voteGovActionTxHash: event.target.value})}
                                />
                            </FormGroup>

                            <FormGroup
                                helperText=""
                                label="Gov Action Tx Vote Index"
                            >
                                <InputGroup
                                    disabled={false}
                                    leftIcon="id-number"
                                    onChange={(event) => this.setState({voteGovActionIndex: event.target.value})}
                                />
                            </FormGroup>

                            <FormGroup
                                helperText="Yes | No | Abstain"
                                label="Vote Choice"
                            >
                                <InputGroup
                                    disabled={false}
                                    leftIcon="id-number"
                                    onChange={(event) => this.setState({voteChoice: event.target.value})}
                                />
                            </FormGroup>

                            <FormGroup
                                label="Optional: Metadata URL"
                            >
                                <InputGroup
                                    disabled={false}
                                    leftIcon="id-number"
                                    onChange={(event) => this.setState({cip95MetadataURL: event.target.value})}
                                />
                            </FormGroup>

                            <FormGroup
                                helperText=""
                                label="Optional: Metadata Hash"
                            >
                                <InputGroup
                                    disabled={false}
                                    leftIcon="id-number"
                                    onChange={(event) => this.setState({cip95MetadataHash: event.target.value})}
                                />
                            </FormGroup>
                            <button style={{padding: "10px"}} onClick={ () => this.addCCVote()}>Build, add to Tx</button>
                        </div>
                    } />
                    <Tab id="4" title="🗳 CC MultiSig Script Vote" panel={
                        <div style={{marginLeft: "20px"}}>

                            <FormGroup
                                label="CC MultiSig Script"
                                helperText="(Hex encoded)"
                            >
                                <InputGroup
                                    disabled={false}
                                    leftIcon="id-number"
                                    onChange={(event) => this.handleMultiSigScriptInput(event.target.value)}
                                    defaultValue={this.state.multiSigScript ? this.state.multiSigScript.to_hex() : ''}
                                />
                            </FormGroup>

                            <FormGroup
                                label="Gov Action Tx Hash"
                            >
                                <InputGroup
                                    disabled={false}
                                    leftIcon="id-number"
                                    onChange={(event) => this.setState({voteGovActionTxHash: event.target.value})}
                                    defaultValue={this.state.voteGovActionTxHash}
                                />
                            </FormGroup>

                            <FormGroup
                                label="Gov Action Tx Vote Index"
                            >
                                <InputGroup
                                    disabled={false}
                                    leftIcon="id-number"
                                    onChange={(event) => this.setState({voteGovActionIndex: event.target.value})}
                                    defaultValue={this.state.voteGovActionIndex}
                                />
                            </FormGroup>

                            <FormGroup
                                helperText="Yes | No | Abstain"
                                label="Vote Choice"
                            >
                                <InputGroup
                                    disabled={false}
                                    leftIcon="id-number"
                                    onChange={(event) => this.setState({voteChoice: event.target.value})}
                                    defaultValue={this.state.voteChoice}
                                />
                            </FormGroup>

                            <FormGroup
                                label="Optional: Metadata URL"
                            >
                                <InputGroup
                                    disabled={false}
                                    leftIcon="id-number"
                                    onChange={(event) => this.setState({cip95MetadataURL: event.target.value})}
                                />
                            </FormGroup>

                            <FormGroup
                                helperText=""
                                label="Optional: Metadata Hash"
                            >
                                <InputGroup
                                    disabled={false}
                                    leftIcon="id-number"
                                    onChange={(event) => this.setState({cip95MetadataHash: event.target.value})}
                                />
                            </FormGroup>
                            <button style={{padding: "10px"}} onClick={ () => this.addMultiSigVote()}>Build, add to Tx</button>
                        </div>
                    } />
                    <Tab id="5" title=" 💯 Test Basic Transaction" panel={
                        <div style={{marginLeft: "20px"}}>

                            <button style={{padding: "10px"}} onClick={ () => this.buildSubmitConwayTx(true) }>Build, .signTx() and .submitTx()</button>

                        </div>
                    } />
                    <Tabs.Expander />
                </Tabs>
                <hr style={{marginTop: "10px", marginBottom: "10px"}}/>
                
                <p><span style={{fontWeight: "bold"}}>Contents of transaction: </span></p>

                {!this.state.buildingError && !this.state.signAndSubmitError && (
                    <ul>{this.state.govActsInTx.concat(this.state.certsInTx.concat(this.state.votesInTx)).length > 0 ? this.state.govActsInTx.concat(this.state.certsInTx.concat(this.state.votesInTx)).map((item, index) => ( <li style={{ fontSize: "12px" }} key={index}>{item}</li>)) : <li>No certificates, votes or gov actions in transaction.</li>}</ul>
                )}
                {[
                    { title: "🚨 Error during building 🚨", error: this.state.buildingError },
                    { title: "🚨 Error during sign and submit 🚨", error: this.state.signAndSubmitError }
                ].map(({ title, error }, index) => (
                    error && (
                        <React.Fragment key={index}>
                            <h5>{title}</h5>
                            <div>
                                {typeof error === 'object' && error !== null ? (
                                    <ul>
                                        {Object.entries(error).map(([key, value], i) => (
                                            <li key={i}>
                                                <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : value}
                                            </li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p><span style={{ fontWeight: "bold" }}>{error}</span></p>
                                )}
                            </div>
                        </React.Fragment>
                    )
                ))}
                
                <button style={{padding: "10px"}} onClick={ () => this.buildSubmitConwayTx(true) }>.signTx() and .submitTx()</button>
                <button style={{padding: "10px"}} onClick={this.refreshData}>Refresh</button> 

                <hr style={{marginTop: "10px", marginBottom: "10px"}}/>
                {this.state.cip95ResultTx !== '' && this.state.cip95ResultHash !== '' && (
                <>
                    <h5>🚀 Transaction signed and submitted successfully 🚀</h5>
                </>
                )}
                <p><span style={{fontWeight: "bold"}}>Tx Hash: </span>{this.state.cip95ResultHash}</p>
                <p><span style={{fontWeight: "bold"}}>CborHex Tx: </span>{this.state.cip95ResultTx}</p>
                <hr style={{marginTop: "2px", marginBottom: "10px"}}/>
                
                <h5>💖 Powered by CSL 12.0.0 beta 2 💖</h5>
            </div>
        )
    }
}

export default App;
