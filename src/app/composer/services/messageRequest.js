import _ from 'lodash';

import { STATUS } from '../../constants';
import { SUCCESS, DRAFT_NOT_EXIST, MESSAGE_ALREADY_SEND } from '../constants/index';

/* @ngInject */
function messageRequest(dispatchers, messageApi, gettextCatalog) {
    const I18N = {
        ERROR_REQUEST_DRAFT: gettextCatalog.getString('Saving draft failed, please  try again', null, 'Error'),
        ERROR_SENDING: gettextCatalog.getString('Cannot send message', null, 'Error')
    };

    const { dispatcher } = dispatchers(['composer.update']);
    const dispatch = (type, data = {}) => dispatcher['composer.update'](type, data);

    function getSendError(data) {
        // The API can return the error via a 4X or via 2X...
        if (_.has(data, 'data')) {
            return getSendError(data.data);
        }

        return new Error(data.Error || I18N.ERROR_SENDING);
    }

    const getEditPromise = (type = STATUS.CREATE, parameters) => {
        if (type === STATUS.UPDATE) {
            return messageApi.updateDraft(parameters);
        }
        return messageApi.createDraft(parameters);
    };

    /**
     * Handle the draft request
     * @param {Object} parameters
     * @param {Integer} type
     * @return {Promise}
     */
    async function draft(parameters, message, type) {
        try {
            const { data } = await getEditPromise(type, parameters);

            if (data.Code === SUCCESS || data.Code === DRAFT_NOT_EXIST) {
                return data;
            }

            if (data.Code === MESSAGE_ALREADY_SEND) {
                return dispatch('close.message', { message });
            }
        } catch (err) {
            const { data = {} } = err || {};

            throw new Error(data.Error || I18N.ERROR_REQUEST_DRAFT);
        }
    }

    async function send(parameters) {
        try {
            const { data = {} } = await messageApi.send(parameters);
            return data;
        } catch (e) {
            // Check if there is an error coming from the server
            const err = getSendError(e);
            err.code = e.Code;
            throw err;
        }
    }

    return { draft, send };
}
export default messageRequest;
