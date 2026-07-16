import React from 'react';
import { useSearchParams } from 'react-router-dom';
import apiClient from '../../api/client';

export interface ObjectSubObjectRow {
  id: string;
  globalObjectId: string;
  name: string;
  description?: string | null;
  sortOrder?: number;
}

const mapSubObject = (row: any): ObjectSubObjectRow => ({
  id: String(row.id || ''),
  globalObjectId: String(row.global_object_id || row.globalObjectId || ''),
  name: String(row.name || ''),
  description: row.description ?? null,
  sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
});

const useObjectSubObjectSelection = (objectId: string) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [subObjects, setSubObjects] = React.useState<ObjectSubObjectRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const selectedSubObjectId = searchParams.get('subObjectId') || '';

  const setSelectedSubObjectId = React.useCallback((subObjectId: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (subObjectId) {
        next.set('subObjectId', subObjectId);
      } else {
        next.delete('subObjectId');
      }
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  const loadSubObjects = React.useCallback(async () => {
    if (!objectId) {
      setSubObjects([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiClient.get(`/api/global-objects/${objectId}/sub-objects`);
      const rows = Array.isArray(response.data?.data) ? response.data.data.map(mapSubObject) : [];
      setSubObjects(rows);
    } catch {
      setSubObjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [objectId]);

  React.useEffect(() => {
    loadSubObjects().catch(() => {
      setSubObjects([]);
    });
  }, [loadSubObjects]);

  React.useEffect(() => {
    if (subObjects.length === 0) {
      if (selectedSubObjectId) {
        setSelectedSubObjectId('');
      }
      return;
    }
    if (!selectedSubObjectId || !subObjects.some((row) => row.id === selectedSubObjectId)) {
      setSelectedSubObjectId(subObjects[0].id);
    }
  }, [selectedSubObjectId, setSelectedSubObjectId, subObjects]);

  return {
    subObjects,
    isLoading,
    reloadSubObjects: loadSubObjects,
    selectedSubObjectId,
    setSelectedSubObjectId,
    selectedSubObject: subObjects.find((row) => row.id === selectedSubObjectId) || null,
  };
};

export default useObjectSubObjectSelection;