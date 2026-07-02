import { SignClient } from '@walletconnect/sign-client';

let signClient: Awaited<ReturnType<typeof SignClient.init>> | null = null;

export async function getSignClient() {
  if (signClient) return signClient;

  signClient = await SignClient.init({
    projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '',
    metadata: {
      name: 'NexS Wallet',
      description: 'Wallet no-custodial multicadena',
      url: process.env.NEXT_PUBLIC_APP_URL || 'https://nexs-wallet.vercel.app',
      icons: ['/logo.png'],
    },
  });

  return signClient;
}

export async function pairWithDApp(uri: string) {
  return (await getSignClient()).pair({ uri });
}

export async function revokeSession(topic: string) {
  const client = await getSignClient();
  return client.disconnect({
    topic,
    reason: { code: 6000, message: 'User disconnected' },
  });
}

export async function approveSession(
  id: number,
  solanaAddress: string,
) {
  const client = await getSignClient();
  const { acknowledged } = await client.approve({
    id,
    namespaces: {
      solana: {
        accounts: [
          `solana:mainnet:${solanaAddress}`,
        ],
        methods: [
          'solana_signTransaction',
          'solana_signMessage',
        ],
        events: [],
      },
    },
  });

  await acknowledged();
}
