import React, { useState, useEffect, useRef } from 'react';
import { Button, Layout, Form, Input, Tree, Select, Menu as AntdMenu } from 'antd';
import {
    EditOutlined,
    PlusOutlined,
    DeleteOutlined,
    ExportOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { notification } from 'antd';


const { Content, Sider } = Layout;
const { DirectoryTree } = Tree;
const { Option } = Select;
const {  } = AntdMenu;

const App = () => {
    const [treeData, setTreeData] = useState([]);
    const [, setParentNode] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const [selectedNodeType, setSelectedNodeType] = useState(null);
    const [form] = Form.useForm();
    const [isEditing, setIsEditing] = useState(false);
    const [addNodeType, setAddNodeType] = useState('Group');
    const [isAddButtonDisabled, setIsAddButtonDisabled] = useState(true);
    const [isNameFieldEditable, setIsNameFieldEditable] = useState(false);
    const groupCounter = useRef(1);
    const propertyCounter = useRef(1);

    const fetchData = async () => {
        try {
            const response = await axios.get('http://localhost:3001/treeData');
            const loadedTreeData = response.data;

            // Calculate counters based on the loaded data
            let maxGroupCounter = 0;
            let maxPropertyCounter = 0;

            const updateCounters = (nodes) => {
                nodes.forEach((node) => {
                    const [type, key] = node.key.split('|');
                    if (type === 'g') {
                        const groupKey = parseInt(key, 10);
                        if (groupKey > maxGroupCounter) {
                            maxGroupCounter = groupKey;
                        }
                    } else if (type === 'p') {
                        const propertyKey = parseInt(key, 10);
                        if (propertyKey > maxPropertyCounter) {
                            maxPropertyCounter = propertyKey;
                        }
                    }

                    if (node.children) {
                        updateCounters(node.children);
                    }
                });
            };

            updateCounters(loadedTreeData);

            // Update counters with the loaded data
            groupCounter.current = maxGroupCounter + 1;
            propertyCounter.current = maxPropertyCounter + 1;

            setTreeData(loadedTreeData);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const updateAddButtonStatus = (type) => {
        setIsAddButtonDisabled(!(selectedNode && (type === 'g' || (type === 'p' && addNodeType === 'Property'))));
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


    const handleAddNodeTypeChange = (value) => {
        setAddNodeType(value);
        updateAddButtonStatus(selectedNodeType);
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
        setIsNameFieldEditable(false); // Закрыть поле "Наименование"
    };


    const onEditClick = () => {
        if (selectedNode) {
            setIsEditing(true);
            setIsNameFieldEditable(true); // Разрешить редактирование поля "Наименование"
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

        saveDataToServer(treeData);
    };

    const saveDataToServer = async (data) => {
        try {
            await axios.put('http://localhost:3001/treeData', { treeData: data });
            console.log('Data saved successfully');
        } catch (error) {
            console.error('Error saving data:', error);
            throw new Error('Ошибка при сохранении данных на сервере.');
        }
    };

    const handleMenuClick = (key) => {
        switch (key) {
            case 'add':
                onAddClick();
                break;
            case 'edit':
                onEditClick();
                break;
            case 'delete':
                onDeleteClick();
                break;
            case 'exportToFile':
                exportDataToFile();
                break;
            default:
                break;
        }
    };

    const exportDataToFile = () => {
        try {
            const dataToExport = JSON.stringify(treeData, null, 2); // Преобразование данных в строку JSON
            const blob = new Blob([dataToExport], { type: 'text/plain' }); // Создание Blob с текстовым содержимым
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'exported_data.txt'; // Имя файла
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            notification.success({
                message: 'Данные успешно выгружены в файл.',
            });
        } catch (error) {
            console.error('Error exporting data to file:', error);
            notification.error({
                message: 'Ошибка при выгрузке данных в файл.',
                description: error.message,
            });
        }
    };
    const onSelect = (keys, event) => {
        setSelectedNode(event.node);
        const [type, id] = event.node.key.split('|');
        setSelectedNodeType(type);
        setParentNode(event.node.parent);
        form.setFieldsValue({
            type: type === 'g' ? 'Group' : 'Property',
            id,
            name: event.node.title,
            parent: event.node.parent?.key || '', // Используйте 'key' вместо 'title'
        });
        setIsEditing(false);
        updateAddButtonStatus(type);
    };


    return (
        <Layout>
            <AntdMenu theme="dark" mode="horizontal" defaultSelectedKeys={['add']} onClick={({ key }) => handleMenuClick(key)}>
                <AntdMenu.Item key="add" icon={<PlusOutlined />} disabled={isAddButtonDisabled}>
                    Добавить
                </AntdMenu.Item>
                <Select
                    style={{ marginLeft: '10px', width: '80px' }}
                    size="small"
                    onChange={handleAddNodeTypeChange}
                    value={addNodeType}
                >
                    <Option value="Group">Группа</Option>
                    <Option value="Property">Свойство</Option>
                </Select>
                <AntdMenu.Item key="edit" icon={<EditOutlined />} disabled={!selectedNode}>
                    Редактировать
                </AntdMenu.Item>
                <AntdMenu.Item key="delete" icon={<DeleteOutlined />} disabled={!selectedNode}>
                    Удалить
                </AntdMenu.Item>
                <AntdMenu.Item key="exportToFile" icon={<ExportOutlined />}>
                    Выгрузить в файл
                </AntdMenu.Item>

            </AntdMenu>

            <Layout>
                <Sider width={250} style={{background: 'rgba(73,8,8,0)', paddingTop: '20px', paddingBottom: '50px', paddingLeft: '10px', paddingRight: '10px' }}>
                    <DirectoryTree defaultExpandAll onSelect={onSelect} treeData={treeData} />
                </Sider>
                <Layout style={{ marginLeft: '250px',padding: '0 24px 24px' }}>
                    <Content>
                        <Form form={form} layout="vertical">
                            {selectedNode && (
                                <>
                                    <Form.Item key="type" label="Тип" name="type">
                                        <Input disabled />
                                    </Form.Item>
                                    <Form.Item key="id" label="Идентификатор" name="id">
                                        <Input disabled />
                                    </Form.Item>
                                    <Form.Item key="name" label="Наименование" name="name">
                                        <Input disabled={!isNameFieldEditable} />
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
        </Layout>
    );
};

export default App;
