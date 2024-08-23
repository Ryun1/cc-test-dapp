import {
    Credential,
    Certificate,
    Ed25519KeyHash,
    CommitteeHotAuth,
    CommitteeColdResign,
    Anchor,
    AnchorDataHash,
    URL,
} from "@emurgo/cardano-serialization-lib-asmjs"

// Helper functions

export function keyHashStringToCredential (input) {
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
