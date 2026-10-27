import type { QueryImage, SearchHit } from '../../domain/types';

export interface VisualSearchRequest {
  image: QueryImage;
  maxResults: number;
  minScore: number;
}

export interface VisualSearchResponse {
  jobId: string;
  hits: SearchHit[];
}

export interface VisualSearchClient {
  search(request: VisualSearchRequest): Promise<VisualSearchResponse>;
}
