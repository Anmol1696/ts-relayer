import { toAscii } from '@cosmjs/encoding';
import { createPagination, createRpc, QueryClient } from '@cosmjs/stargate';
import { QueryChannelClientStateResponse } from '@cosmjs/stargate/build/codec/ibc/core/channel/v1/query';
import Long from 'long';

import { CommitmentProof } from '../../codec/confio/proofs';
import { Any } from '../../codec/google/protobuf/any';
import { Channel } from '../../codec/ibc/core/channel/v1/channel';
import {
  QueryClientImpl as ChannelQuery,
  QueryChannelConsensusStateResponse,
  QueryChannelResponse,
  QueryChannelsResponse,
  QueryConnectionChannelsResponse,
  QueryNextSequenceReceiveResponse,
  QueryPacketAcknowledgementResponse,
  QueryPacketAcknowledgementsResponse,
  QueryPacketCommitmentResponse,
  QueryPacketCommitmentsResponse,
  QueryPacketReceiptResponse,
  QueryUnreceivedAcksResponse,
  QueryUnreceivedPacketsResponse,
} from '../../codec/ibc/core/channel/v1/query';
import { Height } from '../../codec/ibc/core/client/v1/client';
import {
  QueryClientImpl as ClientQuery,
  QueryClientParamsResponse,
  QueryClientStateResponse,
  QueryClientStatesResponse,
  QueryConsensusStateRequest,
  QueryConsensusStateResponse,
  QueryConsensusStatesResponse,
} from '../../codec/ibc/core/client/v1/query';
import { MerkleProof } from '../../codec/ibc/core/commitment/v1/commitment';
import { ConnectionEnd } from '../../codec/ibc/core/connection/v1/connection';
import {
  QueryClientImpl as ConnectionQuery,
  QueryClientConnectionsResponse,
  QueryConnectionClientStateResponse,
  QueryConnectionConsensusStateRequest,
  QueryConnectionConsensusStateResponse,
  QueryConnectionResponse,
  QueryConnectionsResponse,
} from '../../codec/ibc/core/connection/v1/query';
import { ClientState as TendermintClientState } from '../../codec/ibc/lightclients/tendermint/v1/tendermint';
import { ProofOps } from '../../codec/tendermint/crypto/proof';

function decodeTendermintClientStateAny(
  clientState: Any | undefined
): TendermintClientState {
  if (clientState?.typeUrl !== '/ibc.lightclients.tendermint.v1.ClientState') {
    throw new Error(`Unexpected client state type: ${clientState?.typeUrl}`);
  }
  return TendermintClientState.decode(clientState.value);
}

export interface IbcExtension {
  readonly ibc: {
    readonly channel: {
      readonly channel: (
        portId: string,
        channelId: string
      ) => Promise<QueryChannelResponse>;
      readonly channels: (
        paginationKey?: Uint8Array
      ) => Promise<QueryChannelsResponse>;
      readonly allChannels: () => Promise<QueryChannelsResponse>;
      readonly connectionChannels: (
        connection: string,
        paginationKey?: Uint8Array
      ) => Promise<QueryConnectionChannelsResponse>;
      readonly allConnectionChannels: (
        connection: string
      ) => Promise<QueryConnectionChannelsResponse>;
      readonly clientState: (
        portId: string,
        channelId: string
      ) => Promise<QueryChannelClientStateResponse>;
      readonly consensusState: (
        portId: string,
        channelId: string,
        revisionNumber: number,
        revisionHeight: number
      ) => Promise<QueryChannelConsensusStateResponse>;
      readonly packetCommitment: (
        portId: string,
        channelId: string,
        sequence: number
      ) => Promise<QueryPacketCommitmentResponse>;
      readonly packetCommitments: (
        portId: string,
        channelId: string,
        paginationKey?: Uint8Array
      ) => Promise<QueryPacketCommitmentsResponse>;
      readonly allPacketCommitments: (
        portId: string,
        channelId: string
      ) => Promise<QueryPacketCommitmentsResponse>;
      readonly packetReceipt: (
        portId: string,
        channelId: string,
        sequence: number
      ) => Promise<QueryPacketReceiptResponse>;
      readonly packetAcknowledgement: (
        portId: string,
        channelId: string,
        sequence: number
      ) => Promise<QueryPacketAcknowledgementResponse>;
      readonly packetAcknowledgements: (
        portId: string,
        channelId: string,
        paginationKey?: Uint8Array
      ) => Promise<QueryPacketAcknowledgementsResponse>;
      readonly allPacketAcknowledgements: (
        portId: string,
        channelId: string
      ) => Promise<QueryPacketAcknowledgementsResponse>;
      readonly unreceivedPackets: (
        portId: string,
        channelId: string,
        packetCommitmentSequences: readonly number[]
      ) => Promise<QueryUnreceivedPacketsResponse>;
      readonly unreceivedAcks: (
        portId: string,
        channelId: string,
        packetAckSequences: readonly number[]
      ) => Promise<QueryUnreceivedAcksResponse>;
      readonly nextSequenceReceive: (
        portId: string,
        channelId: string
      ) => Promise<QueryNextSequenceReceiveResponse>;
    };
    readonly client: {
      readonly state: (clientId: string) => Promise<QueryClientStateResponse>;
      readonly states: (
        paginationKey?: Uint8Array
      ) => Promise<QueryClientStatesResponse>;
      readonly allStates: () => Promise<QueryClientStatesResponse>;
      readonly consensusState: (
        clientId: string,
        height?: number
      ) => Promise<QueryConsensusStateResponse>;
      readonly consensusStates: (
        clientId: string,
        paginationKey?: Uint8Array
      ) => Promise<QueryConsensusStatesResponse>;
      readonly allConsensusStates: (
        clientId: string
      ) => Promise<QueryConsensusStatesResponse>;
      readonly params: () => Promise<QueryClientParamsResponse>;
      readonly stateTm: (clientId: string) => Promise<TendermintClientState>;
      readonly statesTm: (
        paginationKey?: Uint8Array
      ) => Promise<TendermintClientState[]>;
      readonly allStatesTm: () => Promise<TendermintClientState[]>;
    };
    readonly connection: {
      readonly connection: (
        connectionId: string
      ) => Promise<QueryConnectionResponse>;
      readonly connections: (
        paginationKey?: Uint8Array
      ) => Promise<QueryConnectionsResponse>;
      readonly allConnections: () => Promise<QueryConnectionsResponse>;
      readonly clientConnections: (
        clientId: string
      ) => Promise<QueryClientConnectionsResponse>;
      readonly clientState: (
        connectionId: string
      ) => Promise<QueryConnectionClientStateResponse>;
      readonly consensusState: (
        connectionId: string,
        revisionNumber: number,
        revisionHeight: number
      ) => Promise<QueryConnectionConsensusStateResponse>;
    };
    readonly proof: {
      readonly channel: {
        readonly channel: (
          portId: string,
          channelId: string,
          proveHeight?: number
        ) => Promise<QueryChannelResponse>;
        readonly packetCommitment: (
          portId: string,
          channelId: string,
          sequence: number
        ) => Promise<QueryPacketCommitmentResponse>;
        readonly packetAcknowledgement: (
          portId: string,
          channelId: string,
          sequence: number
        ) => Promise<QueryPacketAcknowledgementResponse>;
        readonly nextSequenceReceive: (
          portId: string,
          channelId: string
        ) => Promise<QueryNextSequenceReceiveResponse>;
      };
      readonly client: {
        readonly state: (
          clientId: string,
          height?: number
        ) => Promise<QueryClientStateResponse & { proofHeight: Height }>;
        readonly consensusState: (
          clientId: string,
          consensusHeight: number,
          proveHeight?: number
        ) => Promise<QueryConsensusStateResponse>;
      };
      readonly connection: {
        readonly connection: (
          connectionId: string,
          height?: number
        ) => Promise<QueryConnectionResponse>;
      };
    };
  };
}

export function setupIbcExtension(base: QueryClient): IbcExtension {
  const rpc = createRpc(base);
  // Use these services to get easy typed access to query methods
  // These cannot be used for proof verification
  const channelQueryService = new ChannelQuery(rpc);
  const clientQueryService = new ClientQuery(rpc);
  const connectionQueryService = new ConnectionQuery(rpc);

  return {
    ibc: {
      channel: {
        channel: async (portId: string, channelId: string) =>
          channelQueryService.Channel({
            portId: portId,
            channelId: channelId,
          }),
        channels: async (paginationKey?: Uint8Array) =>
          channelQueryService.Channels({
            pagination: createPagination(paginationKey),
          }),
        allChannels: async () => {
          const channels = [];
          let response: QueryChannelsResponse;
          let key: Uint8Array | undefined;
          do {
            response = await channelQueryService.Channels({
              pagination: createPagination(key),
            });
            channels.push(...response.channels);
            key = response.pagination?.nextKey;
          } while (key);
          return {
            channels: channels,
            height: response.height,
          };
        },
        connectionChannels: async (
          connection: string,
          paginationKey?: Uint8Array
        ) =>
          channelQueryService.ConnectionChannels({
            connection: connection,
            pagination: createPagination(paginationKey),
          }),
        allConnectionChannels: async (connection: string) => {
          const channels = [];
          let response: QueryConnectionChannelsResponse;
          let key: Uint8Array | undefined;
          do {
            response = await channelQueryService.ConnectionChannels({
              connection: connection,
              pagination: createPagination(key),
            });
            channels.push(...response.channels);
            key = response.pagination?.nextKey;
          } while (key);
          return {
            channels: channels,
            height: response.height,
          };
        },
        clientState: async (portId: string, channelId: string) =>
          channelQueryService.ChannelClientState({
            portId: portId,
            channelId: channelId,
          }),
        consensusState: async (
          portId: string,
          channelId: string,
          revisionNumber: number,
          revisionHeight: number
        ) =>
          channelQueryService.ChannelConsensusState({
            portId: portId,
            channelId: channelId,
            revisionNumber: Long.fromNumber(revisionNumber, true),
            revisionHeight: Long.fromNumber(revisionHeight, true),
          }),
        packetCommitment: async (
          portId: string,
          channelId: string,
          sequence: number
        ) =>
          channelQueryService.PacketCommitment({
            portId: portId,
            channelId: channelId,
            sequence: Long.fromNumber(sequence, true),
          }),
        packetCommitments: async (
          portId: string,
          channelId: string,
          paginationKey?: Uint8Array
        ) =>
          channelQueryService.PacketCommitments({
            channelId: channelId,
            portId: portId,
            pagination: createPagination(paginationKey),
          }),
        allPacketCommitments: async (portId: string, channelId: string) => {
          const commitments = [];
          let response: QueryPacketCommitmentsResponse;
          let key: Uint8Array | undefined;
          do {
            response = await channelQueryService.PacketCommitments({
              channelId: channelId,
              portId: portId,
              pagination: createPagination(key),
            });
            commitments.push(...response.commitments);
            key = response.pagination?.nextKey;
          } while (key);
          return {
            commitments: commitments,
            height: response.height,
          };
        },
        packetReceipt: async (
          portId: string,
          channelId: string,
          sequence: number
        ) =>
          channelQueryService.PacketReceipt({
            portId: portId,
            channelId: channelId,
            sequence: Long.fromNumber(sequence, true),
          }),
        packetAcknowledgement: async (
          portId: string,
          channelId: string,
          sequence: number
        ) =>
          channelQueryService.PacketAcknowledgement({
            portId: portId,
            channelId: channelId,
            sequence: Long.fromNumber(sequence, true),
          }),
        packetAcknowledgements: async (
          portId: string,
          channelId: string,
          paginationKey?: Uint8Array
        ) =>
          channelQueryService.PacketAcknowledgements({
            portId: portId,
            channelId: channelId,
            pagination: createPagination(paginationKey),
          }),
        allPacketAcknowledgements: async (
          portId: string,
          channelId: string
        ) => {
          const acknowledgements = [];
          let response: QueryPacketAcknowledgementsResponse;
          let key: Uint8Array | undefined;
          do {
            response = await channelQueryService.PacketAcknowledgements({
              channelId: channelId,
              portId: portId,
              pagination: createPagination(key),
            });
            acknowledgements.push(...response.acknowledgements);
            key = response.pagination?.nextKey;
          } while (key);
          return {
            acknowledgements: acknowledgements,
            height: response.height,
          };
        },
        unreceivedPackets: async (
          portId: string,
          channelId: string,
          packetCommitmentSequences: readonly number[]
        ) =>
          channelQueryService.UnreceivedPackets({
            portId: portId,
            channelId: channelId,
            packetCommitmentSequences: packetCommitmentSequences.map((s) =>
              Long.fromNumber(s, true)
            ),
          }),
        unreceivedAcks: async (
          portId: string,
          channelId: string,
          packetAckSequences: readonly number[]
        ) =>
          channelQueryService.UnreceivedAcks({
            portId: portId,
            channelId: channelId,
            packetAckSequences: packetAckSequences.map((s) =>
              Long.fromNumber(s, true)
            ),
          }),
        nextSequenceReceive: async (portId: string, channelId: string) =>
          channelQueryService.NextSequenceReceive({
            portId: portId,
            channelId: channelId,
          }),
      },
      client: {
        state: (clientId: string) =>
          clientQueryService.ClientState({ clientId }),
        states: (paginationKey?: Uint8Array) =>
          clientQueryService.ClientStates({
            pagination: createPagination(paginationKey),
          }),
        allStates: async () => {
          const clientStates = [];
          let response: QueryClientStatesResponse;
          let key: Uint8Array | undefined;
          do {
            response = await clientQueryService.ClientStates({
              pagination: createPagination(key),
            });
            clientStates.push(...response.clientStates);
            key = response.pagination?.nextKey;
          } while (key);
          return {
            clientStates: clientStates,
          };
        },
        consensusState: (clientId: string, consensusHeight?: number) =>
          clientQueryService.ConsensusState(
            QueryConsensusStateRequest.fromPartial({
              clientId: clientId,
              revisionHeight:
                consensusHeight !== undefined
                  ? Long.fromNumber(consensusHeight, true)
                  : undefined,
              latestHeight: consensusHeight === undefined,
            })
          ),
        consensusStates: (clientId: string, paginationKey?: Uint8Array) =>
          clientQueryService.ConsensusStates({
            clientId: clientId,
            pagination: createPagination(paginationKey),
          }),
        allConsensusStates: async (clientId: string) => {
          const consensusStates = [];
          let response: QueryConsensusStatesResponse;
          let key: Uint8Array | undefined;
          do {
            response = await clientQueryService.ConsensusStates({
              clientId: clientId,
              pagination: createPagination(key),
            });
            consensusStates.push(...response.consensusStates);
            key = response.pagination?.nextKey;
          } while (key);
          return {
            consensusStates: consensusStates,
          };
        },
        params: () => clientQueryService.ClientParams({}),
        stateTm: async (clientId: string) => {
          const response = await clientQueryService.ClientState({ clientId });
          return decodeTendermintClientStateAny(response.clientState);
        },
        statesTm: async (paginationKey?: Uint8Array) => {
          const { clientStates } = await clientQueryService.ClientStates({
            pagination: createPagination(paginationKey),
          });
          return clientStates.map(({ clientState }) =>
            decodeTendermintClientStateAny(clientState)
          );
        },
        allStatesTm: async () => {
          const clientStates = [];
          let response: QueryClientStatesResponse;
          let key: Uint8Array | undefined;
          do {
            response = await clientQueryService.ClientStates({
              pagination: createPagination(key),
            });
            clientStates.push(...response.clientStates);
            key = response.pagination?.nextKey;
          } while (key);
          return clientStates.map(({ clientState }) =>
            decodeTendermintClientStateAny(clientState)
          );
        },
      },
      connection: {
        connection: async (connectionId: string) =>
          connectionQueryService.Connection({
            connectionId: connectionId,
          }),
        connections: async (paginationKey?: Uint8Array) =>
          connectionQueryService.Connections({
            pagination: createPagination(paginationKey),
          }),
        allConnections: async () => {
          const connections = [];
          let response: QueryConnectionsResponse;
          let key: Uint8Array | undefined;
          do {
            response = await connectionQueryService.Connections({
              pagination: createPagination(key),
            });
            connections.push(...response.connections);
            key = response.pagination?.nextKey;
          } while (key);
          return {
            connections: connections,
            height: response.height,
          };
        },
        clientConnections: async (clientId: string) =>
          connectionQueryService.ClientConnections({
            clientId: clientId,
          }),
        clientState: async (connectionId: string) =>
          connectionQueryService.ConnectionClientState({
            connectionId: connectionId,
          }),
        consensusState: async (connectionId: string, revisionHeight: number) =>
          connectionQueryService.ConnectionConsensusState(
            QueryConnectionConsensusStateRequest.fromPartial({
              connectionId: connectionId,
              revisionHeight: Long.fromNumber(revisionHeight, true),
            })
          ),
      },
      proof: {
        channel: {
          channel: async (
            portId: string,
            channelId: string,
            proveHeight?: number
          ) => {
            // key: https://github.com/cosmos/cosmos-sdk/blob/ef0a7344af345882729598bc2958a21143930a6b/x/ibc/24-host/keys.go#L117-L120
            const key = toAscii(
              `channelEnds/ports/${portId}/channels/${channelId}`
            );
            const proven = await base.queryRawProof('ibc', key, proveHeight);
            const channel = Channel.decode(proven.value);
            const proof = convertProofsToIcs23(proven.proof);
            const proofHeight = Height.fromPartial({
              revisionHeight: new Long(proven.height),
            });
            return {
              channel: channel,
              proof: proof,
              proofHeight: proofHeight,
            };
          },
          packetCommitment: async (
            portId: string,
            channelId: string,
            sequence: number
          ) => {
            // key: https://github.com/cosmos/cosmos-sdk/blob/ef0a7344af345882729598bc2958a21143930a6b/x/ibc/24-host/keys.go#L183-L185
            const key = toAscii(
              `commitments/ports/${portId}/channels/${channelId}/packets/${sequence}`
            );
            const proven = await base.queryRawProof('ibc', key);
            const commitment = proven.value;
            const proof = convertProofsToIcs23(proven.proof);
            const proofHeight = Height.fromPartial({
              revisionHeight: new Long(proven.height),
            });
            return {
              commitment: commitment,
              proof: proof,
              proofHeight: proofHeight,
            };
          },
          packetAcknowledgement: async (
            portId: string,
            channelId: string,
            sequence: number
          ) => {
            // keeper: https://github.com/cosmos/cosmos-sdk/blob/3bafd8255a502e5a9cee07391cf8261538245dfd/x/ibc/04-channel/keeper/keeper.go#L159-L166
            // key: https://github.com/cosmos/cosmos-sdk/blob/ef0a7344af345882729598bc2958a21143930a6b/x/ibc/24-host/keys.go#L153-L156
            const key = toAscii(
              `acks/ports/${portId}/channels/${channelId}/acknowledgements/${sequence}`
            );
            const proven = await base.queryRawProof('ibc', key);
            const acknowledgement = proven.value;
            const proof = convertProofsToIcs23(proven.proof);
            const proofHeight = Height.fromPartial({
              revisionHeight: new Long(proven.height),
            });
            return {
              acknowledgement: acknowledgement,
              proof: proof,
              proofHeight: proofHeight,
            };
          },
          nextSequenceReceive: async (portId: string, channelId: string) => {
            // keeper: https://github.com/cosmos/cosmos-sdk/blob/3bafd8255a502e5a9cee07391cf8261538245dfd/x/ibc/04-channel/keeper/keeper.go#L92-L101
            // key: https://github.com/cosmos/cosmos-sdk/blob/ef0a7344af345882729598bc2958a21143930a6b/x/ibc/24-host/keys.go#L133-L136
            const key = toAscii(
              `seqAcks/ports/${portId}/channels/${channelId}/nextSequenceAck`
            );
            const proven = await base.queryRawProof('ibc', key);
            const nextSequenceReceive = Long.fromBytesBE([...proven.value]);
            const proof = convertProofsToIcs23(proven.proof);
            const proofHeight = Height.fromPartial({
              revisionHeight: new Long(proven.height),
            });
            return {
              nextSequenceReceive: nextSequenceReceive,
              proof: proof,
              proofHeight: proofHeight,
            };
          },
        },
        client: {
          state: async (clientId: string, height?: number) => {
            const key = `clients/${clientId}/clientState`;
            const proven = await base.queryRawProof(
              'ibc',
              toAscii(key),
              height
            );
            const clientState = Any.decode(proven.value);
            const proof = convertProofsToIcs23(proven.proof);
            const proofHeight = Height.fromPartial({
              revisionHeight: new Long(proven.height),
            });
            return {
              clientState,
              proof,
              proofHeight,
            };
          },
          consensusState: async (
            clientId: string,
            consensusHeight: number,
            proveHeight?: number
          ) => {
            // TODO: accept other revisionNumber
            const key = `clients/${clientId}/consensusStates/0-${consensusHeight}`;
            const proven = await base.queryRawProof(
              'ibc',
              toAscii(key),
              proveHeight
            );
            const consensusState = Any.decode(proven.value);
            const proof = convertProofsToIcs23(proven.proof);
            const proofHeight = Height.fromPartial({
              revisionHeight: new Long(proven.height),
            });
            return {
              consensusState,
              proof,
              proofHeight,
            };
          },
        },
        connection: {
          connection: async (connectionId: string, height?: number) => {
            const key = `connections/${connectionId}`;
            const proven = await base.queryRawProof(
              'ibc',
              toAscii(key),
              height
            );
            const connection = ConnectionEnd.decode(proven.value);
            const proof = convertProofsToIcs23(proven.proof);
            const proofHeight = Height.fromPartial({
              revisionHeight: new Long(proven.height),
            });
            return {
              connection,
              proof,
              proofHeight,
            };
          },
        },
      },
    },
  };
}

function convertProofsToIcs23(ops: ProofOps): Uint8Array {
  const proofs = ops.ops.map((op) => CommitmentProof.decode(op.data));
  const resp = MerkleProof.fromPartial({
    proofs,
  });
  return MerkleProof.encode(resp).finish();
}
