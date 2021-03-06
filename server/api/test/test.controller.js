/**
 * Using Rails-like standard naming convention for endpoints.
 * GET     /api/tests              ->  index
 * POST    /api/tests              ->  create
 * GET     /api/tests/:id          ->  show
 * PUT     /api/tests/:id          ->  update
 * DELETE  /api/tests/:id          ->  destroy
 */

'use strict';

import _ from 'lodash';
import Test from './test.model.js';
import Tests from '../../../tests';
import upload from '../../config/multer';
let uploadIcon = upload('icon');

function respondWithResult(res, statusCode) {
    statusCode = statusCode || 200;
    return function (entity) {
        if (entity) {
            res.status(statusCode).json(entity);
        }
    };
}

function saveUpdates(updates) {
    return function (entity) {
        var updated = _.merge(entity, updates);
        return updated.saveAsync()
            .spread(updated => {
                return updated;
            });
    };
}

function removeEntity(res) {
    return function (entity) {
        if (entity) {
            return entity.removeAsync()
                .then(() => {
                    res.status(204).end();
                });
        }
    };
}

function handleEntityNotFound(res) {
    return function (entity) {
        if (!entity) {
            res.status(404).end();
            return null;
        }
        return entity;
    };
}

function handleError(res, statusCode) {
    statusCode = statusCode || 500;
    return function (err) {
        res.status(statusCode).json(err);
    };
}

function setPassCount(fields) {
	return function(entities) {
		return new Promise((resolve, reject) => {
			if (!fields.passCount) return resolve(entities);
			let isArray = _.isArray(entities);
			if (!isArray) entities = [entities];
			let counter = 0;
			for (let i = 0; i < entities.length; i++) {
				let entity = entities[i];
				entity.getPassCount().then(count => {
					counter++;
					entity.passCount = count;
					if (counter == entities.length) {
						if (isArray) resolve(entities);
						else resolve(entities[0]);
					}
				});
			}
		});
	};
}

// Gets a list of Tests
export function index(req, res) {
	let fields = req.query.fields && JSON.parse(req.query.fields);
    Test.findAsync(req.query.ids && {'_id': { $in: req.query.ids}} || {}, fields)
		.then(setPassCount(fields))
        .then(respondWithResult(res))
        .catch(handleError(res));
}

// Gets a single Test from the DB
export function show(req, res) {
	let fields = req.query.fields && JSON.parse(req.query.fields);
    Test.findByIdAsync(req.params.id, fields)
        .then(handleEntityNotFound(res))
		.then(setPassCount(fields))
        .then(respondWithResult(res))
        .catch(handleError(res));
}

// Creates a new Test in the DB
export function create(req, res) {
    Test.createAsync(req.body)
		.then(Tests.load)
		.then(uploadIcon(req, res))
        .then(respondWithResult(res, 201))
        .catch(handleError(res));
}

// Updates an existing Test in the DB
export function update(req, res) {
    if (req.body._id) {
        delete req.body._id;
    }
    Test.findByIdAsync(req.params.id)
        .then(handleEntityNotFound(res))
        .then(saveUpdates(req.body))
		.then(Tests.load)
		.then(uploadIcon(req, res))
        .then(respondWithResult(res))
        .catch(handleError(res));
}

// Deletes a Test from the DB
export function destroy(req, res) {
    Test.findByIdAsync(req.params.id)
        .then(handleEntityNotFound(res))
        .then(removeEntity(res))
        .catch(handleError(res));
}

//Test stats
export function stats(req, res) {
	//TODO: test stats
}
