import type { ActivitySpec, Recommendation } from "./schemas.js";

/**
 * 미래 기능의 경계만 선언한다. v0.1에서는 구현하거나 네트워크를 호출하지 않는다.
 */
export interface RemoteRecommendationProvider {
  readonly providerId: string;
  recommend(prompt: string): Promise<Recommendation>;
}

export interface AdditionalTemplateProvider {
  readonly templateId: string;
  supports(recommendation: Recommendation): boolean;
  generate(recommendation: Recommendation): Promise<ActivitySpec>;
}

export interface StudentActivityPublisher {
  publishNewActivity(projectId: string): Promise<{ studentUrl: string }>;
}

export interface ExtensionDistributionChannel {
  readonly channel: "managed-browser" | "store";
  getInstallLocation(): Promise<string>;
}
