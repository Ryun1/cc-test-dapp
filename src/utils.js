import {
    BigNum,
    Credential,
    Certificate,
    Ed25519KeyHash,
    DRep,
    CommitteeHotAuth,
    CommitteeColdResign,
    Anchor,
    Voter,
    GovernanceActionId,
    TransactionHash,
    VotingProcedure,
    AnchorDataHash,
    URL,
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


// Committee Certs

// Authorize Hot Credential
export function buildAuthorizeHotCredCert(certBuilder, coldCredential, hotCredential) {
    try {
        const coldCredentialTarget = keyHashStringToCredential(coldCredential)
        const hotCredentialTarget = keyHashStringToCredential(hotCredential)
        const committeeHotAuthCert = CommitteeHotAuth.new(coldCredentialTarget, hotCredentialTarget);
        certBuilder.add(Certificate.new_committee_hot_auth(committeeHotAuthCert));
        return certBuilder;
    } catch (err) {
        console.error(err);
        return null;
    }
}

// Resign Cold Credential
export function buildResignColdCredCert(certBuilder, coldCredential, anchorURL=undefined, anchorHash=undefined) {
    try {
        const coldCredentialTarget = keyHashStringToCredential(coldCredential)
        let committeeHotAuthCert;
        if (anchorURL && anchorHash) {
            const anchor = Anchor.new(URL.new(anchorURL), AnchorDataHash.from_hex(anchorHash));
            committeeHotAuthCert = CommitteeColdResign.new_with_anchor(coldCredentialTarget, anchor);
        } else {
            committeeHotAuthCert = CommitteeColdResign.new(coldCredentialTarget);
        }
        certBuilder.add(Certificate.new_committee_cold_resign(committeeHotAuthCert));
        return certBuilder;
    } catch (err) {
        console.error(err);
        return null;
    }
}

export function buildCCVote(votingBuilder, hotCredential, govActionTx, govActionTxIndex, votingChoice, anchorURL=undefined, anchorHash=undefined) {
    try {
        const voter = Voter.new_constitutional_committee_hot_key(keyHashStringToCredential(hotCredential));
        const govActionId = GovernanceActionId.new(TransactionHash.from_hex(govActionTx), govActionTxIndex);
        // Voting choice
        let vote;
        if ((votingChoice).toUpperCase() === "YES") {
            vote = 1
        } else if ((votingChoice).toUpperCase() === "NO") {
            vote = 0
        } else if ((votingChoice).toUpperCase() === "ABSTAIN") {
            vote = 2
        }
        let votingProcedure;
        if (anchorURL && anchorHash) {
            const anchor = Anchor.new(URL.new(anchorURL), AnchorDataHash.from_hex(anchorHash));
            votingProcedure = VotingProcedure.new_with_anchor(vote, anchor);
        } else {
            votingProcedure = VotingProcedure.new(vote);
        };
        votingBuilder.add(voter, govActionId, votingProcedure);
        return votingBuilder; 
    } catch (err) {
        console.log(err);
        return null;
    }
}