export type CommunityPoint = readonly [x: number, y: number, z: number]

export const communityNetwork = {
  nodes: [
    { id: 'member-north', position: [-1.8, 1.1, 0] as CommunityPoint, role: 'member' },
    { id: 'member-northeast', position: [0, 1.8, -0.1] as CommunityPoint, role: 'member' },
    { id: 'member-east', position: [1.9, 0.9, 0.1] as CommunityPoint, role: 'member' },
    { id: 'member-southeast', position: [1.5, -1.3, -0.1] as CommunityPoint, role: 'member' },
    { id: 'member-south', position: [-0.2, -1.8, 0.1] as CommunityPoint, role: 'member' },
    { id: 'member-west', position: [-1.9, -0.8, 0] as CommunityPoint, role: 'member' },
    { id: 'group-ledger', position: [0, 0, 0.15] as CommunityPoint, role: 'ledger' },
  ],
  links: [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0],
    [0, 6], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  ] as const,
} as const
