'use strict';

if (self.importScripts) {
  self.importScripts('/resources/testharness.js');
  self.importScripts('../resources/test-utils.js');
  self.importScripts('../resources/recording-streams.js');
}

const error1 = new Error('error1');
error1.name = 'error1';

promise_test(t => {

  const ws = recordingWritableStream({
    close() {
      throw error1;
    }
  });

  const writer = ws.getWriter();

  return promise_rejects(t, error1, writer.close(), 'close() promise must reject with the thrown error')
  .then(() => promise_rejects(t, error1, writer.ready, 'ready promise must reject with the thrown error'))
  .then(() => {
    assert_array_equals(ws.events, ['close']);
  });

}, 'Underlying sink close: throwing method');

promise_test(t => {

  const ws = recordingWritableStream({
    close() {
      return Promise.reject(error1);
    }
  });

  const writer = ws.getWriter();

  return promise_rejects(t, error1, writer.close(), 'close() promise must reject with the same error')
  .then(() => promise_rejects(t, error1, writer.ready, 'ready promise must reject with the same error'))
  .then(() => {
    assert_array_equals(ws.events, ['close']);
  });

}, 'Underlying sink close: returning a rejected promise');

promise_test(t => {

  const ws = recordingWritableStream({
    write(chunk) {
      if (ws.events.length === 2) {
        return delay(10);
      }

      return Promise.reject(error1);
    }
  });

  const writer = ws.getWriter();


  // Do not wait for this; we want to test the ready promise when the stream is "full" (desiredSize = 0), but if we wait
  // then the stream will transition back to "empty" (desiredSize = 1)
  writer.write('a');
  const readyPromise = writer.ready;

  return promise_rejects(t, error1, writer.write('b'), 'second write must reject with the same error').then(() => {
    assert_equals(writer.ready, readyPromise,
      'the ready promise must not change, since the queue was full after the first write, so the pending one simply ' +
      'transitioned');
    return promise_rejects(t, error1, writer.ready, 'ready promise must reject with the same error');
  })
  .then(() => {
    assert_array_equals(ws.events, ['write', 'a', 'write', 'b']);
  });

}, 'Underlying sink write: returning a rejected promise (second write)');
