import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './createdash.css';
import ConfigurePanel from './Configure/Sidebar';
import CreatePage from './Create/create';
import Publish from './Publish/Publish';
import Analyze from './Analyze/Analyze';
import PreviewQuiz from '../preview/preview';
import { GoEye } from "react-icons/go";
import HrNavbar from '../../../../HrNavbar/HrNavbar';

const CreateDash = ({ defaultTab }) => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [selectedView, setSelectedView] = useState(defaultTab || 'Create');

  const menuItems = [
    { id: 'create', name: 'Create' },
    { id: 'configure', name: 'Configure' },
    { id: 'publish', name: 'Publish' },
    { id: 'analyze', name: 'Analyze' },
  ];

  useEffect(() => {
    if (defaultTab) {
      setSelectedView(defaultTab);
    }
  }, [defaultTab]);

  const handleMenuItemClick = (view) => {
    setSelectedView(view);
    navigate(`/edit/${view.toLowerCase()}/${token}`);
  };

  const renderContent = () => {
    switch (selectedView) {
      case 'Configure':
        return <ConfigurePanel />;
      case 'Publish':
        return <Publish />;
      case 'Analyze':
        return <Analyze token = {token}/>;
      default:
        return <CreatePage />;
    }
  };

  return (
    <div className="CreateDash_Navbody">
      <HrNavbar />
      <div className="CreateDash_top-panel">
        <ul className="CreateDash_menu">
          {menuItems.map((item) => (
            <li
              key={item.id}
              onClick={() => handleMenuItemClick(item.name)}
              className={selectedView === item.name ? 'active' : ''}
            >
              {item.name}
            </li>
          ))}
          <li
            key="preview"
            onClick={() => handleMenuItemClick('Preview')}
            className={`CreateDash_Preview ${selectedView === 'Preview' ? 'active' : ''}`}
          >
            <GoEye size={13} className="icon-spacing" /> Preview
          </li>
        </ul>
      </div>
      <div className="CreateDash_content">
        {selectedView === 'Preview' ? <PreviewQuiz token={token} /> : renderContent()}
      </div>
    </div>
  );
};

export default CreateDash;
