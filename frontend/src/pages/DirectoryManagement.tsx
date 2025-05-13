import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, message, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { directoryApi } from '../services/api';
import { Directory } from '../types';

const DirectoryManagement: React.FC = () => {
  const [directories, setDirectories] = useState<Directory[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchDirectories = async () => {
    try {
      setLoading(true);
      const response = await directoryApi.listDirectories();
      setDirectories(response.data);
    } catch (error: any) {
      message.error(error.response?.data?.error || '获取目录列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDirectories();
  }, []);

  const handleCreateDirectory = async (values: any) => {
    try {
      await directoryApi.createDirectory(values.name, values.path);
      message.success('创建目录成功');
      setModalVisible(false);
      form.resetFields();
      fetchDirectories();
    } catch (error: any) {
      message.error(error.response?.data?.error || '创建目录失败');
    }
  };

  const handleDeleteDirectory = async (id: number) => {
    try {
      await directoryApi.deleteDirectory(id);
      message.success('删除目录成功');
      fetchDirectories();
    } catch (error: any) {
      message.error(error.response?.data?.error || '删除目录失败');
    }
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '路径',
      dataIndex: 'path',
      key: 'path',
    },
    {
      title: '创建者',
      dataIndex: ['user', 'username'],
      key: 'creator',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => new Date(date).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Directory) => (
        <Space>
          <Button
            type="primary"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteDirectory(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setModalVisible(true)}
        >
          创建目录
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={directories}
        rowKey="id"
        loading={loading}
      />

      <Modal
        title="创建目录"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
      >
        <Form
          form={form}
          onFinish={handleCreateDirectory}
          layout="vertical"
        >
          <Form.Item
            name="name"
            label="目录名称"
            rules={[{ required: true, message: '请输入目录名称' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="path"
            label="目录路径"
            rules={[{ required: true, message: '请输入目录路径' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建
              </Button>
              <Button onClick={() => setModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default DirectoryManagement; 