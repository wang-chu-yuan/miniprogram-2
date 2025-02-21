Page({
  data: {
    tempImagePath: '', // 临时图片路径
    recognitionResult: '', // 识别结果
    isLoading: false // 加载状态
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
  submitImage() {
    if (!this.data.tempImagePath) {
      return;
    }
    
    this.setData({ isLoading: true });
    wx.showLoading({ title: '识别中...' });

    // 1. 首先将图片上传到Coze
    this.uploadImageToCoze(this.data.tempImagePath)
      .then(fileId => {
        // 2. 获取识别结果
        return this.getRecognitionResult(fileId);
      })
      .then(result => {
        this.setData({
          recognitionResult: result,
          isLoading: false
        });
        wx.hideLoading();
      })
      .catch(error => {
        console.error('识别失败:', error);
        wx.hideLoading();
        wx.showToast({
          title: '识别失败',
          icon: 'error'
        });
        this.setData({ isLoading: false });
      });
  },

  // 上传图片到Coze
  uploadImageToCoze(filePath) {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: 'https://api.coze.cn/v1/files/upload',
        filePath: filePath,
        name: 'file',
        header: {
          'Authorization': 'Bearer pat_LlANEPpiLXUGK12tBbhzobfCQnUlBp93J6hSctp7czc8RfM2LymJuvvKns5ALvfS',
          'Content-Type': 'multipart/form-data'
        },
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
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

  // 获取识别结果
  getRecognitionResult(fileId) {
    // TODO: 实现第二个API调用
    // 等待您提供第二个API的详细信息
    return new Promise((resolve, reject) => {
      // 这里将实现第二个API的调用
      // resolve(recognitionResult);
    });
  }
}); 