import React from 'react';
import apiClient from '../api/client';
import {
  AiCdmFieldProposal,
  AiMappingSuggestion,
  AiSubObjectProposal,
  CdmFieldInput,
  SourceFieldInput,
} from '../types/objectAi';

const toMessage = (error: any, fallback: string) => {
  return error?.response?.data?.error
    || error?.response?.data?.message
    || error?.message
    || fallback;
};

export const useAiSubObjectProposals = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const run = React.useCallback(async (objectId: string, maxSubObjects: number = 8) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post(`/api/objects/${objectId}/analyze-subobjects`, { maxSubObjects });
      const payload = res.data?.data || {};
      return {
        proposals: (payload.subObjectProposals || []) as AiSubObjectProposal[],
        warnings: (payload.warnings || []) as string[],
      };
    } catch (err: any) {
      const msg = toMessage(err, 'Failed to analyze sub-objects.');
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { run, loading, error, setError };
};

export const useAiCdmDerivation = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const run = React.useCallback(async (subObjectId: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post(`/api/subobjects/${subObjectId}/derive-cdm`, {});
      const payload = res.data?.data || {};
      return {
        proposals: (payload.cdmFieldProposals || []) as AiCdmFieldProposal[],
        warnings: (payload.warnings || []) as string[],
      };
    } catch (err: any) {
      const msg = toMessage(err, 'Failed to derive CDM fields.');
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { run, loading, error, setError };
};

export const useAiMappingSuggestions = () => {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const run = React.useCallback(async (payload: {
    objectName: string;
    subObjectId?: string;
    sourceFields: SourceFieldInput[];
    cdmFields: CdmFieldInput[];
  }) => {
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post('/api/mappings/suggest', payload);
      const data = res.data?.data || {};
      return {
        suggestions: (data.mappingSuggestions || []) as AiMappingSuggestion[],
        unmappedSourceFields: (data.unmappedSourceFields || []) as string[],
        averageConfidenceScore: Number(data.averageConfidenceScore || 0),
        warnings: (data.warnings || []) as string[],
      };
    } catch (err: any) {
      const msg = toMessage(err, 'Failed to generate mapping suggestions.');
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  return { run, loading, error, setError };
};
