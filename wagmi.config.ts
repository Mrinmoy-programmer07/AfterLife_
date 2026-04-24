import { http, createConfig } from 'wagmi'
import { arbitrumSepolia, mantleSepoliaTestnet } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
    chains: [arbitrumSepolia, mantleSepoliaTestnet],
    connectors: [
        injected(),
    ],
    transports: {
        // Official Arbitrum Sepolia RPC
        [arbitrumSepolia.id]: http("https://sepolia-rollup.arbitrum.io/rpc"),
        // Official Mantle Sepolia RPC
        [mantleSepoliaTestnet.id]: http("https://rpc.sepolia.mantle.xyz"),
    },
})
