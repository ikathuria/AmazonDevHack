/* eslint-env es2020 */
import {Dimensions} from 'react-native';
import {act, fireEvent, render, screen} from '@testing-library/react-native';
import * as React from 'react';

import {App} from '../src/App';
import {patels} from './fixtures';

// The board loads /state with fetch and follows /events with XHR; both are faked here.
class SilentXHR {
  readyState = 0;
  status = 0;
  responseText = '';
  open() {}
  setRequestHeader() {}
  send() {}
  abort() {}
}

describe('App', () => {
  const realFetch = globalThis.fetch;
  const realXHR = globalThis.XMLHttpRequest;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    // Vega SDK 0.24's Jest mock of Dimensions.addEventListener returns nothing, which crashes React Native's
    // useWindowDimensions on unmount. Give it a subscription like the real API (logged in FRICTION_LOG.md).
    jest.useFakeTimers(); // animations and clocks would otherwise fire after the test environment is torn down
    jest.spyOn(Dimensions, 'addEventListener').mockReturnValue({remove: () => {}} as any);
    fetchMock = jest.fn(async (url: string) => ({
      ok: true,
      status: 200,
      json: async () => (url.endsWith('/state') ? patels() : {text: 'Step 2 of 3: Dice the onion.'}),
    }));
    (globalThis as any).fetch = fetchMock;
    (globalThis as any).XMLHttpRequest = SilentXHR;
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    (globalThis as any).fetch = realFetch;
    (globalThis as any).XMLHttpRequest = realXHR;
  });

  it("shows the household's board, the clock and the controls", async () => {
    render(<App />);
    expect(await screen.findByText('THE PATELS · DINNER DEPARTURES')).toBeTruthy();
    expect(screen.getByTestId('clock').props.children).toMatch(/^\d\d:\d\d (MON|TUE|WED|THU|FRI|SAT|SUN)$/);
    expect(screen.getAllByTestId(/^row-d-/).length).toBeGreaterThan(0);
    expect(screen.getByTestId('btn-next_step')).toBeTruthy();
    expect(screen.getByTestId('connection').props.children).toBe('CONNECTING');
  });

  it('calls the tool for a D-pad button and shows its reply', async () => {
    render(<App />);
    await screen.findByText('THE PATELS · DINNER DEPARTURES');
    await act(async () => {
      fireEvent.press(screen.getByTestId('btn-next_step'));
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/tools\/next_step$/),
      expect.objectContaining({method: 'POST', body: '{}'}),
    );
    expect(await screen.findByText('Step 2 of 3: Dice the onion.')).toBeTruthy();
  });
});
