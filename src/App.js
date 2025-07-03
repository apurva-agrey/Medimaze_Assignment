import React from 'react';
import { Card, CardBody, CardTitle } from 'reactstrap';
import './App.css';
import Viewer from './components/Viewer';

function App() {
  return (
    <div className="app-background">
      <div className="translucent-overlay">
        <Card className="main-card">
          <CardBody>
            <CardTitle tag="h4" className="mt-2 d-flex justify-content-center">Spine Labelling Tool</CardTitle>
          </CardBody>
            <Viewer />
        </Card>
      </div>
    </div>
  );
}

export default App;
