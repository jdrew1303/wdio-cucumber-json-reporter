import os from 'os';
import _ from 'lodash';

class JSONBuilder {
  constructor() {
    this.reports = {};
  }

  initialiseReport(cid) {
    if (typeof this.reports[cid] === 'undefined') {
      this.reports[cid] = {};
      this.reports[cid].features = [];
    }
    return this.reports[cid];
  }

  addFeature(options) {
    const report = this.initialiseReport(options.cid);

    report.features.push({
      keyword: options.keyword,
      type: options.type,
      name: options.name,
      description: options.description,
      id: options.id,
      tags: options.tags,
      uri: options.uri,
      line: options.line,
      elements: [],
    });
  }


  addScenario(options) {
    const report = this.initialiseReport(options.cid);

    const featureIndex = report.features.findIndex(feature => feature.id === options.parentId);
    const scenarioIndex = report.features[featureIndex].elements
      .findIndex(scenario => scenario.id === options.id);

    const scenarioData = {
      keyword: options.keyword,
      type: options.type,
      description: options.description,
      name: options.name,
      id: options.id,
      tags: options.tags,
      uri: options.uri,
      line: options.line,
      steps: [],
      arguments: [],
    };

    if (scenarioIndex === -1) {
      report.features[featureIndex].elements.push(scenarioData);
    }
  }

  addStep(options) {
    const report = this.initialiseReport(options.cid);

    const featureIndex = report.features
      .findIndex(feature => feature.elements.find(scenario => scenario.id === options.parentId));

    const scenarioIndex = report
      .features[featureIndex]
      .elements.findIndex(scenario => scenario.id === options.parentId);

    const stepIndex = report
      .features[featureIndex]
      .elements[scenarioIndex]
      .steps.findIndex(step => step.id === options.id);

    const stepData = {
      keyword: options.keyword,
      line: options.line,
      name: options.name,
      id: options.id,
      tags: options.tags,
      uri: options.uri,
      result: options.result,
      embeddings: options.embeddings.map(embedding => ({
        data: embedding.data,
        media: {
          type: embedding.mimeType,
        },
      })),
    };

    const scenario = report.features[featureIndex].elements[scenarioIndex];

    if (stepIndex === -1) {
      scenario.steps.push(stepData);
    } else {
      scenario.steps[stepIndex] = stepData;
    }
    // Attach arguments to the scenario.
    // At the end of report generation, these argumentss can be appended to the scenario title
    scenario.arguments = _.union(scenario.arguments, options.arguments);
  }

  addHook(options) {
    const report = this.initialiseReport(options.cid);

    const featureIndex = report.features
      .findIndex(feature => feature.elements.find(scenario => scenario.id === options.parentId));

    const scenarioIndex = report
      .features[featureIndex]
      .elements.findIndex(scenario => scenario.id === options.parentId);

    const stepData = {
      keyword: options.keyword,
      name: options.name,
      id: options.id,
      tags: options.tags,
      uri: options.uri,
      result: options.result,
      hidden: true,
      embeddings: options.embeddings.map(embedding => ({
        data: embedding.data,
        media: {
          type: embedding.mimeType,
        },
      })),
    };

    report.features[featureIndex].elements[scenarioIndex].steps.push(stepData);
  }

  /**
   * @todo add further meta data
   * test execution start/end/total
   * feature|scenario|scenariooverview|step counts
   * failing test count
   * passing test count
   * @see https://github.com/evrycollin/wdio-allure-addons-reporter/issues/1 for an idea of how to get more data
   */
  addMeta(options) {
    const report = this.initialiseReport(options.cid);
    const platformId = this.getPlatformId();

    report.features.forEach((feature) => {
      feature.metadata = {
        browser: {
          name: options.browser,
          // @todo - check if it's possible to get the browser version from wdio events
          version: options.browser ? options.browser.charAt(0).toUpperCase() + options.browser.slice(1) : '',
        },
        device: options.deviceName,
        platform: {
          name: platformId,
          version: `${os.type()} ${os.release()}`,
        },
      };
    })
  }

  /**
   * Given a scenario with an array of arguments, flatten the arguments into
   * a comma delmited string and append them to the scenario title
   * The arguments array is also cleaned up as this is not part of the scenario JSON spec
   * and is currently just used for convenience
   * @param options
   */
  appendScenarioArgumentsToTitle(options) {
    const report = this.initialiseReport(options.cid);

    const featureIndex = report.features.findIndex(feature => feature.id === options.parentId);
    const scenarioIndex = report.features[featureIndex].elements
      .findIndex(scenario => scenario.id === options.id);

    const scenario = report.features[featureIndex].elements[scenarioIndex];

    if (scenario.arguments.length > 0) {
      scenario.name += ` (${scenario.arguments.join(', ')})`;
    }
    delete scenario.arguments;
  }

  clearEmptyFeatures() {
    Object.keys(this.reports).forEach((key) => {
      this.reports[key].features = this.reports[key].features.filter(
        feature => feature.elements.length > 0
      );
    });
  }

  /**
   * Grabs meta data about the OS for the report output
   */
  getPlatformId() {
    switch (process.platform) {
      case 'darwin': return 'osx';
      case 'win32': return 'windows';
      default: return 'linux';
    }
  }
}

module.exports = JSONBuilder;
