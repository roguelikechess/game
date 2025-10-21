export const MAP_NODES = [
  {
    id: 'start',
    label: 'Outpost Rally',
    type: 'camp',
    depth: 1,
    connections: ['field-1', 'field-2'],
  },
  {
    id: 'field-1',
    label: 'Time-torn Fields',
    type: 'combat',
    depth: 2,
    connections: ['spire'],
  },
  {
    id: 'field-2',
    label: 'Echo Ruins',
    type: 'combat',
    depth: 2,
    connections: ['spire'],
  },
  {
    id: 'spire',
    label: 'Chrono Spire',
    type: 'elite',
    depth: 3,
    connections: ['market'],
  },
  {
    id: 'market',
    label: 'Traveler Market',
    type: 'shop',
    depth: 3,
    connections: ['sanctum'],
  },
  {
    id: 'sanctum',
    label: 'Temporal Sanctum',
    type: 'camp',
    depth: 4,
    connections: [],
  },
];

export function getNodeById(nodeId) {
  return MAP_NODES.find((node) => node.id === nodeId) || null;
}
