import { Unit, UnitAbility } from './game';

export interface FactionInfo {
  id: string;
  name: string;
  shortName: string;
  title: string;
  quote: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    border: string;
  };
  symbol: string;
  logoUrl?: string;
  loreSummary: string;
  leaderName: string;
  strengths: string[];
  factionAbility?: UnitAbility; // FEATURE-003 / CODE-027: Army-wide Faction Ability
}

export interface ArmyRoster {
  id: string;
  name: string;
  factionId: string;
  factionName?: string;
  tags?: string[];
  maxPoints: number;
  totalPoints: number;
  units: Unit[];
  createdAt: string;
  updatedAt: string;
}

export interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
}
