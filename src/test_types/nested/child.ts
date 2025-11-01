export interface ChildData {
  id: number;
  name: string;
  tags: string[];
}

export interface NestedConfig {
  enabled: boolean;
  settings: {
    theme: string;
    count: number;
  };
}
