Page({
  data: {
    tempImagePath: '', // 临时图片路径
    recognitionResult: [],  // 改为数组存储多个结果
    isLoading: false, // 加载状态
    showModal: false, // 添加模态框显示状态
    currentTabIndex: 0  // 添加当前选中的标签页索引
  },

  // 选择图片
  chooseImage() {
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 拍照
          this.takePhoto();
        } else if (res.tapIndex === 1) {
          // 从相册选择
          this.selectFromAlbum();
        }
      }
    });
  },

  // 拍照
  takePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      camera: 'back',
      success: (res) => {
        this.setData({
          tempImagePath: res.tempFiles[0].tempFilePath
        });
      }
    });
  },

  // 从相册选择
  selectFromAlbum() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        this.setData({
          tempImagePath: res.tempFiles[0].tempFilePath
        });
      }
    });
  },

  // 提交图片
  async submitImage() {
    if (!this.data.tempImagePath) {
      return;
    }
    
    this.setData({ isLoading: true });
    wx.showLoading({ title: '识别中...' });

    try {
      const fileId = await this.uploadImageToCoze(this.data.tempImagePath);
      console.log('1. 上传图片结果:', fileId);

      const chatResult = await this.startChat(fileId);
      console.log('2. 发起对话结果:', chatResult);

      const messageResult = await this.pollChatResult(chatResult.data.conversation_id, chatResult.data.id);
      console.log('3. 轮询结果:', messageResult);

      const finalResult = await this.runWorkflow(messageResult);
      console.log('4. 最终识别结果:', finalResult);

      // 检查识别结果是否有效
      if (!finalResult || !Array.isArray(finalResult) || finalResult.length === 0) {
        wx.hideLoading();
        wx.showToast({
          title: '请上传正确的食物图片',
          icon: 'none',
          duration: 2000
        });
        this.setData({ 
          isLoading: false,
          showModal: false
        });
        return;
      }

      // 结果有效时显示模态框
      this.setData({
        recognitionResult: finalResult,
        currentTabIndex: 0,
        isLoading: false,
        showModal: true
      });
      wx.hideLoading();
    } catch (error) {
      console.error('处理失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '识别失败，请重试',
        icon: 'error'
      });
      this.setData({ 
        isLoading: false,
        showModal: false
      });
    }
  },

  // 上传图片到Coze
  uploadImageToCoze(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: 'https://api.coze.cn/v1/files/upload',
        filePath: filePath,
        name: 'file',
        header: {
          'Authorization': 'Bearer pat_CqCc7DBnAVqHuUKOCaB7MSPKU0Nd7q6LopXyA2DzKFr0EIE6r5WJuV4pS8SUV9UB',
          'Content-Type': 'multipart/form-data'
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            console.log(data)
            if (data.code === 0 && data.data && data.data.id) {
              resolve(data.data.id);
            } else {
              reject(new Error('上传失败: ' + data.msg));
            }
          } catch (e) {
            reject(new Error('解析响应失败'));
          }
        },
        fail: reject
      });
    });
  },

  // 发起对话
  startChat(fileId) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://api.coze.cn/v3/chat',
        method: 'POST',
        header: {
          'Authorization': 'Bearer pat_CqCc7DBnAVqHuUKOCaB7MSPKU0Nd7q6LopXyA2DzKFr0EIE6r5WJuV4pS8SUV9UB',
          'Content-Type': 'application/json'
        },
        data: {
          "bot_id": "7474589920456769571",
          "user_id": "1",
          "stream": false,
          "additional_messages": [
            {
              "content_type": "object_string",
              "content": `[{"type": "image","file_id":"${fileId}"}]`,
              "role": "user"
            }
          ]
        },
        success: (res) => {
          if (res.data.code === 0) {
            resolve(res.data);
          } else {
            reject(new Error('对话请求失败: ' + res.data.msg));
          }
        },
        fail: reject
      });
    });
  },

  // 轮询获取对话结果
  pollChatResult(conversationId, chatId) {
    console.log('开始轮询消息，chatId:', chatId, 'conversationId:', conversationId);
    return new Promise((resolve, reject) => {
      const maxAttempts = 10;
      let attempts = 0;
      const poll = () => {
        wx.request({
          url: `https://api.coze.cn/v3/chat/message/list?conversation_id=${conversationId}&chat_id=${chatId}`,
          method: 'GET',
          header: {
              'Authorization': 'Bearer pat_CqCc7DBnAVqHuUKOCaB7MSPKU0Nd7q6LopXyA2DzKFr0EIE6r5WJuV4pS8SUV9UB',
              'Content-Type': 'application/json'
          },
          success(res) {
              console.log('轮询返回数据：', res.data);
              if (res.data.code === 0 && res.data.data) {
                  // 查找 type 为 answer 的消息
                  const answer = res.data.data.find(msg => msg.type === 'answer');
                  if (answer) {
                      const content = JSON.parse(answer.content);
                      resolve(content.output);
                      return;
                  }
              }

              attempts++;
              if (attempts >= maxAttempts) {
                  reject(new Error('轮询超时'));
                  return;
              }

              setTimeout(poll, 1000);
          },
          fail(err) {
              console.error('轮询失败：', err);
              reject(err);
          }
      });
      };

      poll();
    });
  },

  // 运行工作流
  runWorkflow(imageUrl) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://api.coze.cn/v1/workflow/run',
        method: 'POST',
        header: {
          'Authorization': 'Bearer pat_CqCc7DBnAVqHuUKOCaB7MSPKU0Nd7q6LopXyA2DzKFr0EIE6r5WJuV4pS8SUV9UB',
          'Content-Type': 'application/json'
        },
        data: {
          "parameters": {
            "input": imageUrl
          },
          "workflow_id": "7473767812910219305"
        },
        success: (res) => {
          if (res.data.code === 0) {
            try {
              const result = JSON.parse(res.data.data);
              // 确保我们获取 output 数组
              if (result && result.output && Array.isArray(result.output)) {
                resolve(result.output);
              } else {
                reject(new Error('识别结果格式错误'));
              }
            } catch (e) {
              reject(new Error('解析工作流结果失败'));
            }
          } else {
            reject(new Error('工作流执行失败: ' + res.data.msg));
          }
        },
        fail: reject
      });
    });
  },

  // 修改标签页切换方法
  switchTab(e) {
    // 阻止事件冒泡
    if (e.stopPropagation) {
      e.stopPropagation();
    }
    const index = e.currentTarget.dataset.index;
    this.setData({
      currentTabIndex: index
    });
  },

  // 修改阻止冒泡方法
  stopPropagation(e) {
    if (e.stopPropagation) {
      e.stopPropagation();
    }
  },

  // 显示模态框
  showModal() {
    this.setData({
      showModal: true
    });
  },

  // 隐藏模态框
  hideModal() {
    this.setData({
      showModal: false
    });
  }
}); 