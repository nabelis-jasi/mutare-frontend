// src/utils/helpers.js
import PARAMETERS from '../config/parameters';
import moment from 'moment';

const helpers = {
  isOdd(num) {
    return num % 2 === 1;
  },

  getDefaultMapping(mappings) {
    let activeMapping = false;
    Object.values(mappings).forEach((mapping) => {
      if (mapping.is_default) {
        activeMapping = mapping;
      }
    });
    return activeMapping;
  },

  // Get next form in the hierarchy
  getNextForm(forms, currentFormRef) {
    let nextForm = false;
    forms.forEach((form, index) => {
      if (currentFormRef === form.ref) {
        if (index !== forms.length - 1) {
          nextForm = forms[index + 1];
          return false;
        }
      }
    });
    return nextForm;
  },

  // Get previous form in the hierarchy
  getPrevForm(forms, currentFormRef) {
    let prevForm = false;
    forms.forEach((form, index) => {
      if (currentFormRef === form.ref) {
        if (index !== 0) {
          prevForm = forms[index - 1];
          return false;
        }
      }
    });
    return prevForm;
  },

  textTruncate(str, length = PARAMETERS.MAX_TITLE_LENGHT, ending = '...') {
    if (str.length > length) {
      return str.substring(0, length - ending.length) + ending;
    }
    return str;
  },

  getXsrfToken() {
    const cookies = document.cookie.split(';');
    let token = '';
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].split('=');
      if (cookie[0].trim() === 'XSRF-TOKEN') {
        token = decodeURIComponent(cookie[1]);
      }
    }
    return token;
  },

  removeItem(list, index) {
    return [...list.slice(0, index), ...list.slice(index + 1)];
  },

  getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    const regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
    const results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
  },

  getFormName(forms, currentFormRef) {
    for (let i = 0; i < forms.length; i++) {
      if (forms[i].ref === currentFormRef) {
        return forms[i].name;
      }
    }
    return false;
  },

  getQueryString(url) {
    const urlParts = url.split('?', 1);
    return urlParts[urlParts.length - 1];
  },

  getTimeframeParams(activeTimeframe, currentState) {
    const params = { filter_by: 'created_at' };

    switch (activeTimeframe) {
      case PARAMETERS.TIMEFRAME.TODAY:
        params.filter_from = moment().format('YYYY-MM-DD');
        break;
      case PARAMETERS.TIMEFRAME.LAST_7_DAYS:
        params.filter_from = moment().subtract(7, 'd').format('YYYY-MM-DD');
        break;
      case PARAMETERS.TIMEFRAME.LAST_30_DAYS:
        params.filter_from = moment().subtract(30, 'd').format('YYYY-MM-DD');
        break;
      case PARAMETERS.TIMEFRAME.YEAR:
        params.filter_from = moment().year() + '-01-01';
        break;
      case PARAMETERS.TIMEFRAME.CUSTOM:
        params.filter_from = moment(currentState.selectedStartDate).format('YYYY-MM-DD');
        params.filter_to = moment(currentState.selectedEndDate).format('YYYY-MM-DD');
        break;
      default:
        // Lifetime – no date filters
    }
    return params;
  },

  getUploadTemplateEndpoint(params) {
    const endpoint = `${PARAMETERS.SERVER_URL}${PARAMETERS.API_UPLOAD_TEMPLATE_ENDPOINT}`;
    const queryParams = {
      map_index: params.mapIndex,
      form_index: params.formIndex,
      branch_ref: params.currentBranchRef || '',
      format: params.format,
      filename: params.filename,
    };
    const query = '?' + new URLSearchParams(queryParams).toString();
    return endpoint + params.projectSlug + query;
  },

  getUploadHeadersEndpoint(params) {
    const endpoint = `${PARAMETERS.SERVER_URL}${PARAMETERS.API_UPLOAD_HEADERS_ENDPOINT}`;
    const queryParams = {
      map_index: params.mapIndex,
      form_index: params.formIndex,
      branch_ref: params.currentBranchRef || '',
      format: params.format,
    };
    const query = '?' + new URLSearchParams(queryParams).toString();
    return endpoint + params.projectSlug + query;
  },

  getDownloadSubsetEndpoint(params) {
    const endpoint = `${PARAMETERS.SERVER_URL}${PARAMETERS.API_DOWNLOAD_SUBSET_ENDPOINT}`;
    const selfLink = params.hierarchyNavigator[params.hierarchyNavigator.length - 1].selfLink;
    const selfLinkQuery = selfLink.split('?')[1];
    const queryParams = new URLSearchParams(selfLinkQuery);

    queryParams.set('format', PARAMETERS.FORMAT_CSV);
    queryParams.set('filter_by', 'created_at');
    queryParams.set('sort_order', params.filterSortOrder);
    queryParams.set('title', params.filterByTitle);
    queryParams.set('filter_from', params.filterStartDate);
    queryParams.set('filter_to', params.filterEndDate);
    queryParams.set('filename', params.filename);
    queryParams.set('branch_ref', params.currentBranchRef || '');
    queryParams.set('branch_owner_uuid', params.currentBranchOwnerUuid || '');

    return endpoint + params.projectSlug + '?' + queryParams.toString();
  },

  getFormIndexFromRef(forms, formRef) {
    let index = 0;
    forms.forEach((form, formIndex) => {
      if (form.ref === formRef) index = formIndex;
    });
    return index;
  },

  getBranchInputIndexFromRef(inputs, branchInputRef) {
    let index = 0;
    inputs.forEach((input, inputIndex) => {
      if (input.ref === branchInputRef) index = inputIndex;
    });
    return index;
  },

  generateUuid() {
    let d = new Date().getTime();
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      d += performance.now();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (d + Math.random() * 16) % 16 | 0;
      d = Math.floor(d / 16);
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  },

  getParentFormForUpload(forms, currentFormRef) {
    for (let i = 0; i < forms.length; i++) {
      if (forms[i].formRef === currentFormRef) {
        if (i !== forms.length) {
          return {
            parentFormRef: forms[i - 1]?.formRef,
            parentEntryUuid: forms[i]?.parentEntryUuid,
          };
        }
      }
    }
    return false;
  },

  doesAnswerMatchAJump(input, jump, answer, condition) {
    let doesMatch = false;
    const inputTypesWithAnswerArray = [
      PARAMETERS.INPUT_TYPES.EC5_CHECKBOX_TYPE,
      PARAMETERS.INPUT_TYPES.EC5_SEARCH_SINGLE_TYPE,
      PARAMETERS.INPUT_TYPES.EC5_SEARCH_MULTIPLE_TYPE,
    ];

    if (inputTypesWithAnswerArray.includes(input.type)) {
      if (condition === 'IS') {
        if (answer.includes(jump.answer_ref)) doesMatch = true;
      }
      if (condition === 'IS_NOT') {
        if (!answer.includes(jump.answer_ref)) doesMatch = true;
      }
    } else {
      if (condition === 'IS') {
        if (jump.answer_ref === answer) doesMatch = true;
      }
      if (condition === 'IS_NOT') {
        if (jump.answer_ref !== answer) doesMatch = true;
      }
    }
    return doesMatch;
  },
};

export default helpers;
