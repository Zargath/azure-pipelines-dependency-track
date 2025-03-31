import DTrackClient from './dtrackClient.js'
import DTrackManager from './dtrackManager.js'

const client = new DTrackClient('http://dtrack.ctfwfcbsbhfkgbgj.eastus2.azurecontainer.io:8080/', 'odt_cic65OkYLEgfA76tGrKeT6esagmhBTFz');
const manager = new DTrackManager(client);

const projId = 'cc405667-a573-42f4-9a19-f24ccde0c022';
const description = 'Description of the project';
const classifier = 'CONTAINER';
const swidTagId = 'swid:example.com:product:1.1.0';
const group = 'My Group, yup!';
const tags = ['tag1', 'tag2'];

manager.updateProject(projId, description, classifier, swidTagId, group, tags)
  .then(response => {
    console.log('Project updated successfully');
    console.log('body:', response);
  })
  .catch(error => {
    console.error('Error updating project');
    console.log('Code:', error);
  });