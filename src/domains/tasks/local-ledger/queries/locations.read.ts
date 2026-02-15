export interface LocationReadModel {
  id: string;
  parentId: string | null;
  name: string;
  locationType: 'ward' | 'room' | 'bed' | 'unit';
}

export async function getLocationById(_id: string): Promise<LocationReadModel | null> {
  return null;
}

export async function getLocationsByParent(_parentId: string | null): Promise<LocationReadModel[]> {
  return [];
}
