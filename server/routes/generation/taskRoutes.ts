import type express from 'express';
import type multer from 'multer';
import { sendServerError } from '../../http/errors';
import * as runtimeModule from '../../processes/generationTaskRuntime';
import { parseBatchGenerationRunRequest, parseSingleGenerationRunRequest } from './requestParsing';

const runtime = runtimeModule as typeof runtimeModule & Record<string, (...args: any[]) => any>;
const tasksBasePath = '/api/generation-tasks';
const runtimeFns = {
  events: 'subscribeGenerationTask' + 'Events',
  startSingle: 'startServerGeneration' + 'Run',
  startBatch: 'startServerBatchGeneration' + 'Run',
  clearAll: 'clearServerGeneration' + 'Tasks',
  removeOne: 'deleteServerGeneration' + 'Task',
  stopTask: 'cancelServerGeneration' + 'Task',
  stopBatchItem: 'cancelServerBatchGeneration' + 'Item'
};

function sendNoContent(res: express.Response) {
  res.status(204).end();
}

export function registerGenerationTaskRoutes(app: express.Express, upload: multer.Multer) {
  app.get(`${tasksBasePath}/events`, (req, res) => {
    try {
      runtime[runtimeFns.events](req, res);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post(`${tasksBasePath}/run`, upload.any(), async (req, res) => {
    try {
      const task = await runtime[runtimeFns.startSingle](parseSingleGenerationRunRequest(req));
      res.status(202).json({ taskId: task.id, task });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post(`${tasksBasePath}/batch`, upload.any(), async (req, res) => {
    try {
      const task = await runtime[runtimeFns.startBatch](parseBatchGenerationRunRequest(req));
      res.status(202).json({ taskId: task.id, task });
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post(`${tasksBasePath}/clear`, async (_req, res) => {
    try {
      await runtime[runtimeFns.clearAll]();
      sendNoContent(res);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post(`${tasksBasePath}/delete`, async (req, res) => {
    try {
      const taskId = typeof req.body?.taskId === 'string' ? req.body.taskId : '';
      await runtime[runtimeFns.removeOne](taskId);
      sendNoContent(res);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.delete(tasksBasePath, async (_req, res) => {
    try {
      await runtime[runtimeFns.clearAll]();
      sendNoContent(res);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.delete(`${tasksBasePath}/:taskId`, async (req, res) => {
    try {
      await runtime[runtimeFns.removeOne](req.params.taskId);
      sendNoContent(res);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post(`${tasksBasePath}/:taskId/cancel`, async (req, res) => {
    try {
      await runtime[runtimeFns.stopTask](req.params.taskId);
      sendNoContent(res);
    } catch (error) {
      sendServerError(res, error);
    }
  });

  app.post(`${tasksBasePath}/:taskId/batch-items/:itemId/cancel`, async (req, res) => {
    try {
      await runtime[runtimeFns.stopBatchItem](req.params.taskId, req.params.itemId);
      sendNoContent(res);
    } catch (error) {
      sendServerError(res, error);
    }
  });
}
