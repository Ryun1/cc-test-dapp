import {
    BigNum,
    Credential,
    Certificate,
    Ed25519KeyHash,
    DRep,
    StakeRegistration,
    StakeDeregistration,
    CommitteeHotAuth,
    CommitteeColdResign,
} from "@emurgo/cardano-serialization-lib-asmjs"

// Helper functions

function keyHashStringToCredential (input) {
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
        console.log('Error in parsing credential input, not Hex or Bech32');
        return null;
      }
    }
}

function stringToDRep (input) {
    let targetDRep;
    try {
        if ((input).toUpperCase() === 'ABSTAIN') {
            targetDRep = DRep.new_always_abstain();
        } else if ((input).toUpperCase() === 'NO CONFIDENCE') {
            targetDRep = DRep.new_always_no_confidence();
        } else {
            const dRepKeyCred = keyHashStringToCredential(input)
            targetDRep = DRep.new_key_hash(dRepKeyCred.to_keyhash());
        };
        return targetDRep;
    } catch (err) {
        console.log(err);
        console.log('Error in parsing selected DRep!');
        return null;
    }
}

function stringToBigNum (input) {
    try {
        const targetBigNum = BigNum.from_str(input);    
        return targetBigNum;
    } catch (err) {
        console.log(err);
        console.log('Error in deposit amount!');
        return null;
    }
}

// Register Stake Key
export function buildStakeKeyRegCert(certBuilder, stakeCredential, withCoin=false, deposit="2") {
    try {
        const stakeCred = keyHashStringToCredential(stakeCredential);
        let stakeKeyRegCert
        if (withCoin){
            stakeKeyRegCert = StakeRegistration.new_with_coin(stakeCred, stringToBigNum(deposit));
        } else {
            stakeKeyRegCert = StakeRegistration.new(stakeCred);
        }
        certBuilder.add(Certificate.new_stake_registration(stakeKeyRegCert));
        return certBuilder;
    } catch (err) {
        console.log(err);
        return null;
    }
}

// Unregister Stake Key
export function buildStakeKeyUnregCert(certBuilder, stakeCredential, withCoin=false, deposit="2") {
        try {
            const stakeCred = keyHashStringToCredential(stakeCredential);
            let stakeKeyUnregCert
            if (withCoin){
                stakeKeyUnregCert = StakeDeregistration.new_with_coin(stakeCred, stringToBigNum(deposit));
            } else {
                stakeKeyUnregCert = StakeDeregistration.new(stakeCred);
            }
            certBuilder.add(Certificate.new_stake_deregistration(stakeKeyUnregCert));
            return certBuilder;
        } catch (err) {
            console.error(err);
            return null;
        }
}

// Committee Certs

// Authorize Hot Credential
export function buildAuthorizeHotCredCert(certBuilder, coldCredential, hotCredential) {
    try {
        const coldCredentialTarget = keyHashStringToCredential(coldCredential)
        const hotCredentialTarget = keyHashStringToCredential(hotCredential)
        const committeeHotAuthCert = CommitteeHotAuth.new(coldCredentialTarget, hotCredentialTarget);
        certBuilder.add(Certificate.new_committee_hot_key_registration(committeeHotAuthCert));

    } catch (err) {
        console.error(err);
        return null;
    }
}

// Resign Cold Credential
export function buildResignColdCredCert(certBuilder, coldCredential, anchor=undefined) {
    try {
        // todo handle anchor
        const coldCredentialTarget = keyHashStringToCredential(coldCredential)
        const committeeHotAuthCert = CommitteeColdResign.new(coldCredentialTarget);
        certBuilder.add(Certificate.new_committee_hot_key_deregistration(committeeHotAuthCert));
    } catch (err) {
        console.error(err);
        return null;
    }
}
