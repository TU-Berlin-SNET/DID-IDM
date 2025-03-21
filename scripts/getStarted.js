import { EthrDID } from 'ethr-did'

const keypair = EthrDID.createKeyPair()
const ethrDid = new EthrDID({...keypair})
// this creates a DID like:
// did:ethr:0x02ac49094591d32a4e2f93f3368da2d7d827e987ce6cdb3bd3b8a3390fde8fc33b