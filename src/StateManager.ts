import fs from 'fs';
import { env } from 'process';

class StateManager {
  private readonly _networkId: number;
  private _state: any;

  // Public stuff.

  constructor(networkId: number | undefined = undefined) {
    this._networkId = networkId || parseInt(env.NETWORK_ID || '31337');
    // Try and load the state file.
    try { this._state = JSON.parse(fs.readFileSync(this.stateFilename(), 'utf8')); }
    // No state file exists, or it's not formatted properly.
    catch { this.state = {}; }
  }

  // State getter.
  public get state(): any {
    return this._state;
  }

  // State setter - sets state internally and immediatelly writes to the state file.
  public set state(state: Object) {
    fs.writeFileSync(
      this.stateFilename(),
      JSON.stringify(this._state = { ...state }, null, 2))
  }

  // Private stuff.

  private stateFilename(): string {
    return `.openzeppelin/state-${this._networkId}.json`;
  }
}

export { StateManager };
