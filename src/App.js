import React, { useState, useEffect, useRef } from 'react';
import { Button, Layout, Form, Input, Tree, Select } from 'antd';
import { EditOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import 'antd/dist/antd.css';

const { Header, Content, Sider } = Layout;
const { DirectoryTree } = Tree;
const { Option } = Select;

const App = () => {
  const [treeData, setTreeData] = useState([]);
  const [parentNode, setParentNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedNodeType, setSelectedNodeType] = useState(null);
  const [form] = Form.useForm();
  const [isEditing, setIsEditing] = useState(false);
  const [addNodeType, setAddNodeType] = useState('Group');
  const [isAddButtonDisabled, setIsAddButtonDisabled] = useState(true);

  // Счетчики для групп и свойств
  const groupCounter = useRef(1);
  const propertyCounter = useRef(1);

  useEffect(() => {
    const data = [
      { key: `g|${groupCounter.current++}`, title: `Группа ${groupCounter.current}`, children: [] },
      { key: `g|${groupCounter.current++}`, title: `Группа ${groupCounter.current}`, children: [] },
    ];
    setTreeData(data);
  }, []);

  const onSelect = (keys, event) => {
    setSelectedNode(event.node);
    const [type, id] = event.node.key.split('|');
    setSelectedNodeType(type);
    setParentNode(event.node.parent); // Устанавливаем родителя
    form.setFieldsValue({
      type: type === 'g' ? 'Group' : 'Property',
      id,
      name: event.node.title,
      parent: event.node.parent?.title, // Добавляем информацию о родителе в форму
    });
    setIsEditing(false);
    updateAddButtonStatus(type);
  };

  const updateAddButtonStatus = (type) => {
    setIsAddButtonDisabled(!(selectedNode && (type === 'g'|| (type === 'p' && addNodeType === 'Property'))));
  };

  const onSelectType = (value) => {
    setAddNodeType(value);
    updateAddButtonStatus(selectedNodeType);
  };

  const onAddClick = () => {
    if (!treeData.length) {
      // Если в дереве нет элементов, создаем группу
      const newGroupKey = groupCounter.current++;
      const newGroup = {
        key: `g|${newGroupKey}`,
        title: `Группа ${newGroupKey}`,
        children: [],
        type: 'g',
      };

      setTreeData([newGroup]);
      return;
    }

    if (selectedNode && selectedNode.type === 'p') {
      // Если выбранный узел - свойство, не добавляем в него ничего
      return;
    }

    const newNodeKey = addNodeType === 'Group' ? groupCounter.current++ : propertyCounter.current++;
    const newNodeType = addNodeType === 'Group' ? 'g' : 'p';
    const newNode = {
      key: `${newNodeType}|${newNodeKey}`,
      title: `${addNodeType} ${newNodeKey}`,
      children: [],
      type: newNodeType,
    };

    setTreeData((prevData) => {
      const updateTreeNodes = (nodes) => {
        return nodes.map((node) => {
          if (node.key === (selectedNode ? selectedNode.key : 'root')) {
            return { ...node, children: [...node.children, newNode] };
          } else if (node.children) {
            return { ...node, children: updateTreeNodes(node.children) };
          }
          return node;
        });
      };

      return updateTreeNodes(prevData);
    });
  };

  const onSaveChanges = () => {
    setTreeData((prevData) => {
      const updateNodeTitle = (nodes) => {
        return nodes.map((node) => {
          if (node.key === selectedNode.key) {
            return { ...node, title: form.getFieldValue('name') };
          } else if (node.children) {
            return { ...node, children: updateNodeTitle(node.children) };
          }
          return node;
        });
      };
      return updateNodeTitle(prevData);
    });
    setIsEditing(false);
  };

  const onEditClick = () => {
    if (selectedNode) {
      setIsEditing(true);
    }
  };

  const onDeleteClick = () => {
    setTreeData((prevData) => {
      const removeNodeByKey = (nodes, keyToRemove) => {
        return nodes.reduce((result, node) => {
          if (node.key === keyToRemove) {
            return result;
          }
          if (node.children) {
            node = { ...node, children: removeNodeByKey(node.children, keyToRemove) };
          }
          return [...result, node];
        }, []);
      };
      return removeNodeByKey(prevData, selectedNode.key);
    });
    setSelectedNode(null);
    setIsEditing(false);
  };

  return (
      <Layout>
        <Sider width={250} style={{ background: '#807b7b' }}>
          <div className="app-buttons" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex'}}>
              <Button onClick={onAddClick} icon={<PlusOutlined />} size="small" disabled={isAddButtonDisabled}>
                Добавить
              </Button>
              <Select
                  defaultValue="Group"
                  style={{ width: '55%' }}
                  size="small"
                  onChange={onSelectType}
                  value={addNodeType}
              >
                <Option value="Group">Группа</Option>
                <Option value="Property">Свойство</Option>
              </Select>
            </div>
            <Button onClick={onEditClick} disabled={!selectedNode} icon={<EditOutlined />} size="small">
              Редактировать
            </Button>
            <Button onClick={onDeleteClick} disabled={!selectedNode} icon={<DeleteOutlined />} size="small">
              Удалить
            </Button>
          </div>
          <DirectoryTree multiple defaultExpandAll onSelect={onSelect} treeData={treeData} />
        </Sider>
        <Layout style={{ marginLeft: '200px', padding: '0 24px 24px' }}>
          <Content>
            <Form form={form} layout="vertical">
              {selectedNode && (
                  <>
                    <Form.Item label="Тип" name="type">
                      <Input disabled />
                    </Form.Item>
                    <Form.Item label="Идентификатор" name="id">
                      <Input disabled />
                    </Form.Item>
                    <Form.Item label="Наименование" name="name">
                      <Input disabled={!isEditing} />
                    </Form.Item>
                    <Form.Item label="Родитель" name="parent">
                      <Input disabled />
                    </Form.Item>

                    {isEditing && (
                        <Button type="primary" onClick={onSaveChanges}>
                          Сохранить изменения
                        </Button>
                    )}
                  </>
              )}
            </Form>
          </Content>
        </Layout>
      </Layout>
  );
};

export default App;
